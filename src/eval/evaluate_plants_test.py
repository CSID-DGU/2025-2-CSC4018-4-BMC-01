#!/usr/bin/env python3
"""
Evaluate the current species model checkpoint on plants_test dataset
"""

import json
import sys
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent
EVAL_DIR = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.data.image import _load_image, _preprocess
from src.models.species import run_species
from src.config_loader import load_config

def load_labels() -> Dict[int, str]:
    """Load species labels mapping"""
    labels_path = PROJECT_ROOT / "src/train/labels/species.labels.json"
    with open(labels_path, "r", encoding="utf-8") as f:
        labels_obj = json.load(f)

    # Convert to int->str mapping
    labels_map = {}
    for k, v in labels_obj.items():
        labels_map[int(k)] = str(v)

    return labels_map

def get_test_images(test_dir: Path) -> List[Tuple[str, int, Path]]:
    """
    Get all test images with their ground truth labels
    Returns: [(class_name, class_idx, image_path), ...]
    """
    labels_map = load_labels()

    # Create reverse mapping: class_name -> class_idx
    name_to_idx = {v: k for k, v in labels_map.items()}

    test_images = []
    image_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']

    # Iterate through class folders
    for class_folder in sorted(test_dir.iterdir()):
        if not class_folder.is_dir():
            continue

        class_name = class_folder.name

        # Get class index
        if class_name not in name_to_idx:
            print(f"[WARN] Class '{class_name}' not in labels, skipping...")
            continue

        class_idx = name_to_idx[class_name]

        # Get all images in this class folder
        for img_path in sorted(class_folder.iterdir()):
            if img_path.suffix in image_extensions:
                test_images.append((class_name, class_idx, img_path))

    return test_images

def evaluate():
    """Run evaluation on plants_test dataset"""
    cfg = load_config()
    test_dir = PROJECT_ROOT / "samples/plants_test"

    if not test_dir.exists():
        print(f"[ERROR] Test directory not found: {test_dir}")
        return

    print("=" * 70)
    print("Evaluating species model on plants_test dataset")
    print("=" * 70)

    # Get test images
    test_images = get_test_images(test_dir)
    print(f"Found {len(test_images)} test images across {len(set(x[0] for x in test_images))} classes")
    print()

    # Evaluation metrics
    correct = 0
    total = 0
    class_stats = defaultdict(lambda: {"correct": 0, "total": 0})

    # Run inference on each image
    for i, (gt_class_name, gt_class_idx, img_path) in enumerate(test_images, 1):
        try:
            # Load and preprocess image
            to_rgb = bool(cfg["preprocess"]["common"]["to_rgb"])
            raw_img = _load_image(str(img_path), to_rgb=to_rgb)
            tensor, _ = _preprocess(raw_img, mode="species", cfg=cfg)

            # Create metadata
            meta = {
                "stage": "image",
                "mode": "species",
                "source_path": str(img_path)
            }

            # Run inference
            result = run_species(tensor, meta, topk=3)

            pred_class_idx = result["pred_class"]
            pred_class_name = result["pred_label"]
            confidence = result["confidence"]

            # Check if correct
            is_correct = (pred_class_idx == gt_class_idx)

            if is_correct:
                correct += 1
                class_stats[gt_class_name]["correct"] += 1

            total += 1
            class_stats[gt_class_name]["total"] += 1

            # Print progress
            if i % 50 == 0 or not is_correct:
                status = "[OK]" if is_correct else "[FAIL]"
                print(f"{status} {i}/{len(test_images)} | GT: {gt_class_name:30s} | "
                      f"Pred: {pred_class_name:30s} | Conf: {confidence:.3f}")

        except Exception as e:
            print(f"[ERROR] Failed on {img_path}: {e}")
            total += 1
            class_stats[gt_class_name]["total"] += 1
            continue

    # Calculate overall accuracy
    overall_accuracy = (correct / total * 100) if total > 0 else 0.0

    print()
    print("=" * 70)
    print("EVALUATION RESULTS")
    print("=" * 70)
    print(f"Overall Accuracy: {correct}/{total} = {overall_accuracy:.2f}%")
    print()

    # Calculate per-class accuracy
    print("Per-Class Accuracy:")
    print("-" * 70)
    class_accuracies = []
    for class_name in sorted(class_stats.keys()):
        stats = class_stats[class_name]
        class_acc = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0.0
        class_accuracies.append(class_acc)
        print(f"{class_name:40s} : {stats['correct']:3d}/{stats['total']:3d} = {class_acc:6.2f}%")

    # Calculate mean per-class accuracy
    mean_class_accuracy = sum(class_accuracies) / len(class_accuracies) if class_accuracies else 0.0

    print("-" * 70)
    print(f"Mean Per-Class Accuracy: {mean_class_accuracy:.2f}%")
    print("=" * 70)

    # Save results
    results = {
        "overall_accuracy": overall_accuracy,
        "mean_class_accuracy": mean_class_accuracy,
        "correct": correct,
        "total": total,
        "per_class": {
            name: {
                "correct": stats["correct"],
                "total": stats["total"],
                "accuracy": (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0.0
            }
            for name, stats in class_stats.items()
        }
    }

    results_file = EVAL_DIR / "plants_test_evaluation_results.json"
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n[SAVED] Results saved to {results_file}")

if __name__ == "__main__":
    evaluate()
