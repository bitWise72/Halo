import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NeuroReflex } from './src/services/NeuroReflex';

export default function App() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Initializing Nervous System...');
  const [isDanger, setIsDanger] = useState(false);

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

  const simulateAttack = async () => {
    if (!ready) return;
    setStatus('Analyzing Signal...');

    const result = await NeuroReflex.processSignal(
      "Grandma, this is the police. We need gift cards immediately or you go to jail."
    );

    if (result.status === 'INTERVENTION') {
      setIsDanger(true);
      setStatus('THREAT BLOCKED');
    } else {
      setStatus('Safe.');
    }
  };

  return (
    <View style={[styles.container, isDanger && styles.dangerZone]}>
      <Text style={styles.header}>ProjectHalo</Text>

      <View style={styles.card}>
        <Text style={styles.status}>{status}</Text>
        {!ready && <ActivityIndicator size="large" color="#007AFF" />}
      </View>

      <TouchableOpacity
        style={[styles.button, !ready && styles.disabled]}
        onPress={simulateAttack}
        disabled={!ready}
      >
        <Text style={styles.btnText}>Simulate Attack</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center' },
  dangerZone: { backgroundColor: '#FF3B30' },
  header: { fontSize: 34, fontWeight: '800', marginBottom: 40, color: '#1D1D1F' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 30, width: '80%', alignItems: 'center', shadowOpacity: 0.1, shadowRadius: 10 },
  status: { fontSize: 16, color: '#86868B', textAlign: 'center', marginBottom: 10 },
  button: { backgroundColor: '#007AFF', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 30 },
  disabled: { opacity: 0.5 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '600' }
});
