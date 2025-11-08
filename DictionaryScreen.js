import React from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from "react-native";

const plantData = [
  { id: "1", name: "몬스테라1", image: require("../assets/monstera1.jpg") },
  { id: "2", name: "몬스테라2", image: require("../assets/monstera2.jpg") },
  { id: "3", name: "스투키1", image: require("../assets/stuki1.jpg") },
];

export default function DictionaryScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <FlatList
        data={plantData}
        numColumns={3}
        columnWrapperStyle={styles.row}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 20 }} // 상단에서 약 1cm 떨어지게
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("PlantDetail", item)}
          >
            <Image source={item.image} style={styles.image} />
            <Text style={styles.name}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#d6f1ff",
    paddingHorizontal: 10,
  },
  row: {
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    width: "30%",
    borderRadius: 15,
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 15,
  },
  image: {
    width: 65,
    height: 90,
    borderRadius: 10,
  },
  name: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "600",
  },
});
