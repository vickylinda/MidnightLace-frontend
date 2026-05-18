import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Midnight Lace</Text>
      <Text style={styles.subtitle}>App movil de subastas</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf7f4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brand: {
    color: '#19131f',
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#7b6472',
    fontSize: 18,
  },
});
