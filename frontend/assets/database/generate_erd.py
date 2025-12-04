"""
DB 테이블 ERD 생성 스크립트
발표 자료용 데이터베이스 구조 다이어그램
"""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.lines as mlines

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'  # Windows
plt.rcParams['axes.unicode_minus'] = False

# 그림 크기 설정
fig, ax = plt.subplots(figsize=(16, 12))
ax.set_xlim(0, 16)
ax.set_ylim(0, 12)
ax.axis('off')

# 색상 정의
COLOR_HEADER = '#2E7D32'
COLOR_PK = '#FFE082'
COLOR_FK = '#B3E5FC'
COLOR_NORMAL = '#FFFFFF'
COLOR_BORDER = '#424242'

def draw_table(ax, x, y, width, height, title, columns):
    """테이블 박스 그리기"""
    # 테이블 전체 박스
    table_box = FancyBboxPatch(
        (x, y), width, height,
        boxstyle="round,pad=0.05",
        edgecolor=COLOR_BORDER,
        facecolor='white',
        linewidth=2
    )
    ax.add_patch(table_box)

    # 헤더
    header_box = FancyBboxPatch(
        (x, y + height - 0.6), width, 0.6,
        boxstyle="round,pad=0.02",
        edgecolor=COLOR_BORDER,
        facecolor=COLOR_HEADER,
        linewidth=2
    )
    ax.add_patch(header_box)

    # 테이블 이름
    ax.text(x + width/2, y + height - 0.3, title,
            ha='center', va='center',
            fontsize=14, fontweight='bold', color='white')

    # 컬럼 그리기
    col_height = 0.35
    start_y = y + height - 0.6 - col_height

    for col_name, col_type, col_constraint in columns:
        # 컬럼 배경색
        if 'PK' in col_constraint:
            bg_color = COLOR_PK
        elif 'FK' in col_constraint:
            bg_color = COLOR_FK
        else:
            bg_color = COLOR_NORMAL

        col_box = mpatches.Rectangle(
            (x, start_y), width, col_height,
            edgecolor=COLOR_BORDER,
            facecolor=bg_color,
            linewidth=0.5
        )
        ax.add_patch(col_box)

        # 컬럼 이름
        ax.text(x + 0.1, start_y + col_height/2, col_name,
                ha='left', va='center', fontsize=10, fontweight='bold')

        # 컬럼 타입
        ax.text(x + width - 0.1, start_y + col_height/2, f"{col_type} {col_constraint}",
                ha='right', va='center', fontsize=9, style='italic', color='#666')

        start_y -= col_height

def draw_relationship(ax, x1, y1, x2, y2, label='', style='->'):
    """관계선 그리기"""
    arrow = FancyArrowPatch(
        (x1, y1), (x2, y2),
        arrowstyle=style,
        color='#1976D2',
        linewidth=2,
        mutation_scale=20,
        linestyle='--'
    )
    ax.add_patch(arrow)

    if label:
        mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mid_x, mid_y, label,
                ha='center', va='bottom',
                fontsize=9, color='#1976D2',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor='#1976D2'))

# ============================================================
# 1. users 테이블 (좌측 상단)
# ============================================================
users_columns = [
    ('id', 'INTEGER', 'PK'),
    ('name', 'TEXT', 'NOT NULL'),
    ('created_at', 'TIMESTAMP', 'DEFAULT NOW'),
]
draw_table(ax, 0.5, 8, 3.5, 2.5, 'users', users_columns)

# ============================================================
# 2. plants 테이블 (우측 상단)
# ============================================================
plants_columns = [
    ('id', 'INTEGER', 'PK'),
    ('ai_label_en', 'TEXT', ''),
    ('ai_label_ko', 'TEXT', ''),
    ('tempmax_celsius', 'REAL', ''),
    ('tempmin_celsius', 'REAL', ''),
    ('ideallight', 'TEXT', ''),
    ('toleratedlight', 'TEXT', ''),
    ('ideallight_ko', 'TEXT', ''),
    ('toleratedlight_ko', 'TEXT', ''),
    ('watering', 'TEXT', ''),
    ('watering_ko', 'TEXT', ''),
    ('wateringperiod', 'INTEGER', ''),
]
draw_table(ax, 11, 5.5, 4.5, 5.5, 'plants (마스터 데이터)', plants_columns)

# ============================================================
# 3. user_plants 테이블 (중앙)
# ============================================================
user_plants_columns = [
    ('id', 'INTEGER', 'PK'),
    ('user_id', 'INTEGER', 'FK → users'),
    ('plant_id', 'INTEGER', 'FK → plants'),
    ('nickname', 'TEXT', ''),
    ('image', 'TEXT', ''),
    ('ai_label_en', 'TEXT', 'AI 인식'),
    ('ai_label_ko', 'TEXT', 'AI 인식'),
    ('disease', 'TEXT', 'AI 진단'),
    ('tempmax_celsius', 'REAL', ''),
    ('tempmin_celsius', 'REAL', ''),
    ('ideallight', 'TEXT', ''),
    ('toleratedlight', 'TEXT', ''),
    ('watering', 'TEXT', ''),
    ('last_watered', 'DATE', ''),
    ('next_watering', 'DATE', ''),
    ('wateringperiod', 'INTEGER', ''),
    ('score', 'INTEGER', '성실도 (0~100)'),
    ('created_at', 'TIMESTAMP', 'DEFAULT NOW'),
]
draw_table(ax, 5, 1.5, 4.5, 7.5, 'user_plants', user_plants_columns)

# ============================================================
# 4. watering_logs 테이블 (좌측 하단)
# ============================================================
watering_logs_columns = [
    ('id', 'INTEGER', 'PK'),
    ('user_plant_id', 'INTEGER', 'FK → user_plants'),
    ('water_date', 'TEXT', ''),
]
draw_table(ax, 0.5, 2, 3.5, 2, 'watering_logs', watering_logs_columns)

# ============================================================
# 관계선 그리기
# ============================================================
# users → user_plants (1:N)
draw_relationship(ax, 4, 9, 5, 7.5, '1:N', '->')

# plants → user_plants (1:N)
draw_relationship(ax, 11, 8, 9.5, 7, '1:N (참고)', '->')

# user_plants → watering_logs (1:N)
draw_relationship(ax, 5, 2.5, 4, 3, '1:N', '->')

# ============================================================
# 범례
# ============================================================
legend_elements = [
    mpatches.Patch(facecolor=COLOR_PK, edgecolor=COLOR_BORDER, label='Primary Key (PK)'),
    mpatches.Patch(facecolor=COLOR_FK, edgecolor=COLOR_BORDER, label='Foreign Key (FK)'),
    mpatches.Patch(facecolor=COLOR_NORMAL, edgecolor=COLOR_BORDER, label='일반 컬럼'),
    mlines.Line2D([], [], color='#1976D2', linestyle='--', linewidth=2, label='관계선 (Foreign Key)')
]
ax.legend(handles=legend_elements, loc='lower right', fontsize=11, frameon=True, shadow=True)

# ============================================================
# 제목
# ============================================================
ax.text(8, 11.5, 'BMC Plant 앱 - 데이터베이스 구조 (ERD)',
        ha='center', va='top', fontsize=20, fontweight='bold')

ax.text(8, 11, 'SQLite 로컬 DB (expo-sqlite)',
        ha='center', va='top', fontsize=12, style='italic', color='#666')

# ============================================================
# 저장
# ============================================================
plt.tight_layout()
plt.savefig('frontend/db_erd.png', dpi=300, bbox_inches='tight', facecolor='white')
print("ERD image created: frontend/db_erd.png")

plt.show()
