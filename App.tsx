import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { NeuroReflex } from './src/services/NeuroReflex';

export default function App() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Initializing Nervous System...');
  const [isDanger, setIsDanger] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const sdkInit = await NeuroReflex.initialize();
    if (sdkInit) {
      setStatus('Connecting to OLLAMA...');
      const modelLoaded = await NeuroReflex.loadReflexModel();
      if (modelLoaded) {
        setReady(true);
        setStatus('Guardian Active :: OLLAMA Connected');
      } else {
        setStatus('Error: Cannot connect to OLLAMA. Run adb reverse tcp:11434 tcp:11434');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!ready || !inputText.trim() || loading) return;
    setLoading(true);
    setStatus('Analyzing Signal via Llama3...');

    const result = await NeuroReflex.processSignal(inputText);

    if (result.status === 'INTERVENTION') {
      setIsDanger(true);
      setStatus('THREAT BLOCKED: ' + result.reasoning);
    } else {
      setIsDanger(false);
      setStatus('Safe: ' + result.reasoning);
    }
    setLoading(false);
  };

  const handleReset = () => {
    setIsDanger(false);
    setInputText('');
    setStatus('Guardian Active :: OLLAMA Connected');
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, isDanger && styles.dangerZone]}>
      <Text style={[styles.header, isDanger && styles.headerDanger]}>ProjectHalo</Text>
      <Text style={styles.subtitle}>Neuro-Reflex Guardian</Text>

      <View style={styles.card}>
        <View style={[styles.statusDot, ready ? styles.dotGreen : styles.dotRed]} />
        <Text style={[styles.status, isDanger && styles.statusDanger]}>{status}</Text>
        {(!ready || loading) && <ActivityIndicator size="large" color={isDanger ? '#FFFFFF' : '#007AFF'} />}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter text to analyze for threats..."
        placeholderTextColor="#999"
        value={inputText}
        onChangeText={setInputText}
        multiline
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, (!ready || !inputText.trim() || loading) && styles.disabled]}
        onPress={handleAnalyze}
        disabled={!ready || !inputText.trim() || loading}
      >
        <Text style={styles.btnText}>{loading ? 'Analyzing...' : 'Analyze Text'}</Text>
      </TouchableOpacity>

      {isDanger && (
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetText}>Clear Alert</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.footer}>Powered by OLLAMA + Llama3 (Local)</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dangerZone: { backgroundColor: '#FF3B30' },
  header: { fontSize: 36, fontWeight: '800', color: '#1D1D1F', marginTop: 60 },
  headerDanger: { color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#86868B', marginBottom: 30, letterSpacing: 1.5, textTransform: 'uppercase' },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', padding: 24, borderRadius: 20, marginBottom: 24, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 12 },
  dotGreen: { backgroundColor: '#34C759' },
  dotRed: { backgroundColor: '#FF3B30' },
  status: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  statusDanger: { color: '#1D1D1F', fontWeight: '600' },
  input: { width: '100%', backgroundColor: 'white', padding: 16, borderRadius: 14, marginBottom: 16, minHeight: 120, textAlignVertical: 'top', fontSize: 15, color: '#1D1D1F', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  button: { backgroundColor: '#007AFF', paddingVertical: 18, paddingHorizontal: 32, borderRadius: 30, width: '100%', alignItems: 'center', shadowColor: '#007AFF', shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
  disabled: { opacity: 0.4 },
  btnText: { color: 'white', fontSize: 17, fontWeight: '700' },
  resetButton: { marginTop: 16, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 30, borderWidth: 2, borderColor: '#FFFFFF', width: '100%', alignItems: 'center' },
  resetText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  footer: { marginTop: 32, fontSize: 12, color: '#AAAAAA', marginBottom: 40 }
});
