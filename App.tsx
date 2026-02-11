import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { NeuroReflex } from './src/services/NeuroReflex';

export default function App() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Initializing Nervous System...');
  const [isDanger, setIsDanger] = useState(false);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const sdkInit = await NeuroReflex.initialize();
    if (sdkInit) {
      setStatus('Downloading Reflex Model...');
      const modelLoaded = await NeuroReflex.loadReflexModel();
      if (modelLoaded) {
        setReady(true);
        setStatus('Guardian Active (Spinal Cord Online)');
      } else {
        setStatus('Error: Model Load Failed');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!ready || !inputText.trim()) return;
    setStatus('Analyzing Signal...');

    const result = await NeuroReflex.processSignal(inputText);

    if (result.status === 'INTERVENTION') {
      setIsDanger(true);
      setStatus('THREAT BLOCKED: ' + result.reasoning);
    } else {
      setStatus('Safe: ' + result.reasoning);
      setIsDanger(false);
    }
  };

  return (
    <View style={[styles.container, isDanger && styles.dangerZone]}>
      <Text style={styles.header}>ProjectHalo</Text>

      <View style={styles.card}>
        <Text style={styles.status}>{status}</Text>
        {!ready && <ActivityIndicator size="large" color="#007AFF" />}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter text to analyze..."
        value={inputText}
        onChangeText={setInputText}
        multiline
      />

      <TouchableOpacity
        style={[styles.button, (!ready || !inputText) && styles.disabled]}
        onPress={handleAnalyze}
        disabled={!ready || !inputText}
      >
        <Text style={styles.btnText}>Analyze Text</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dangerZone: { backgroundColor: '#FF3B30' },
  header: { fontSize: 34, fontWeight: '800', marginBottom: 40, color: '#1D1D1F' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 30, width: '100%', alignItems: 'center', shadowOpacity: 0.1, shadowRadius: 10 },
  status: { fontSize: 16, color: '#86868B', textAlign: 'center', marginBottom: 10 },
  input: { width: '100%', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20, minHeight: 100, textAlignVertical: 'top' },
  button: { backgroundColor: '#007AFF', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 30, width: '100%', alignItems: 'center' },
  disabled: { opacity: 0.5 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '600' }
});
