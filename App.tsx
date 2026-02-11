import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  ScrollView,
  NativeModules,
  AppState,
} from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { NeuroReflex, AnalysisResult } from './src/services/NeuroReflex';
import { VoiceOutput } from './src/services/VoiceService';
import { COLORS } from './src/theme/colors';

const HaloOverlay = requireNativeModule('HaloOverlay');
const { width } = Dimensions.get('window');
const HALO_SIZE = width * 0.48;

interface AlertEntry {
  id: string;
  result: AnalysisResult;
  transcript: string;
  time: Date;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [statusText, setStatusText] = useState('Awakening...');
  const [modelName, setModelName] = useState('');
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [overlayPermission, setOverlayPermission] = useState(false);

  const haloScale = useRef(new Animated.Value(1)).current;
  const haloOpacity = useRef(new Animated.Value(0.3)).current;
  const outerRingScale = useRef(new Animated.Value(1)).current;
  const dangerFlash = useRef(new Animated.Value(0)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    bootSequence();
    checkOverlayPermission();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkOverlayPermission();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const checkOverlayPermission = async () => {
    try {
      const can = await HaloOverlay.canDrawOverlays();
      setOverlayPermission(can);
    } catch (e) {
      console.log('Overlay check failed:', e);
    }
  };

  const requestOverlay = () => {
    try {
      HaloOverlay.requestOverlayPermission();
    } catch (e) {
      console.log('Overlay request failed:', e);
    }
  };

  const toggleOverlay = () => {
    if (!overlayPermission) {
      requestOverlay();
      return;
    }
    if (overlayEnabled) {
      HaloOverlay.hideOverlay();
      setOverlayEnabled(false);
    } else {
      HaloOverlay.showOverlay(false);
      setOverlayEnabled(true);
    }
  };

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript || '';
    if (event.isFinal && transcript.length > 5) {
      setLiveTranscript('');
      runAnalysis(transcript);
    } else {
      setLiveTranscript(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (activeRef.current) {
      setTimeout(() => startListening(), 800);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('Speech error:', event.error, event.message);
    if (activeRef.current) {
      setTimeout(() => startListening(), 2000);
    }
  });

  const bootSequence = async () => {
    setStatusText('Initializing...');
    await NeuroReflex.initialize();
    setStatusText('Connecting to OLLAMA...');
    const loaded = await NeuroReflex.loadModel();
    if (loaded) {
      setModelName(NeuroReflex.getActiveModel());
      setReady(true);
      setStatusText('Ready to protect');
      startIdlePulse();
    } else {
      setStatusText('No model available');
    }
  };

  const startIdlePulse = () => {
    if (pulseRef.current) pulseRef.current.stop();
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(haloScale, { toValue: 1.06, duration: 2800, useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0.55, duration: 2800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(haloScale, { toValue: 1, duration: 2800, useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0.3, duration: 2800, useNativeDriver: true }),
        ]),
      ])
    );
    pulseRef.current.start();
  };

  const startActivePulse = () => {
    if (pulseRef.current) pulseRef.current.stop();
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(haloScale, { toValue: 1.18, duration: 1000, useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(outerRingScale, { toValue: 1.35, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(haloScale, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(outerRingScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      ])
    );
    pulseRef.current.start();
  };

  const flashDanger = () => {
    Animated.sequence([
      Animated.timing(dangerFlash, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(dangerFlash, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(dangerFlash, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(dangerFlash, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  };

  const startListening = async () => {
    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        setStatusText('Microphone permission required');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
      });
    } catch (e: any) {
      console.log('Listen start error:', e?.message);
      if (activeRef.current) setTimeout(() => startListening(), 3000);
    }
  };

  const stopListening = () => {
    try { ExpoSpeechRecognitionModule.stop(); } catch (e) { }
  };

  const toggleGuardian = async () => {
    if (!ready) return;
    if (active) {
      setActive(false);
      stopListening();
      setLiveTranscript('');
      setStatusText('Guardian resting');
      startIdlePulse();
    } else {
      setActive(true);
      setStatusText('Listening...');
      startActivePulse();
      await startListening();
    }
  };

  const runAnalysis = async (transcript: string) => {
    setAnalyzing(true);
    setStatusText('Analyzing...');
    const result = await NeuroReflex.analyze(transcript);

    if (result.danger) {
      flashDanger();
      setStatusText('Threat Outputting...');

      // Stop listening to prevent feedback loop
      stopListening();

      // Speak the warning
      VoiceOutput.speak('Warning. ' + result.reasoning, true, async () => {
        // Resume listening after speech finishes
        if (activeRef.current) {
          setStatusText('Listening...');
          await new Promise(r => setTimeout(r, 800)); // Small buffer
          startListening();
        }
      });

      if (overlayEnabled) {
        try { HaloOverlay.updateDangerState(true); } catch (e) { }
        setTimeout(() => {
          try { HaloOverlay.updateDangerState(false); } catch (e) { }
        }, 8000); // Keep red longer
      }
    } else {
      if (activeRef.current) setStatusText('Listening...');
    }

    setAlerts(prev => [{ id: Date.now().toString(), result, transcript, time: new Date() }, ...prev].slice(0, 10));
    setAnalyzing(false);
  };

  const clearAlerts = () => {
    setAlerts([]);
    if (active) setStatusText('Listening...');
    else setStatusText('Guardian resting');
  };

  const dangerBgOpacity = dangerFlash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Animated.View style={[styles.dangerOverlay, { opacity: dangerBgOpacity }]} pointerEvents="none" />

      <LinearGradient colors={[COLORS.bg, COLORS.bgLight, COLORS.bg]} style={styles.gradient} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}>

        <View style={styles.topBar}>
          <Text style={styles.appName}>HALO</Text>
          <Text style={styles.tagline}>Your Invisible Guardian Angel</Text>
        </View>

        <View style={styles.centerArea}>
          <View style={styles.haloContainer}>
            <Animated.View style={[styles.outerRing, { transform: [{ scale: outerRingScale }], opacity: haloOpacity }]} />
            <Animated.View style={[styles.haloGlow, { transform: [{ scale: haloScale }], opacity: haloOpacity }]} />
            <TouchableOpacity style={[styles.haloCore, active && styles.haloCoreActive]} onPress={toggleGuardian} activeOpacity={0.8} disabled={!ready}>
              <Ionicons name={active ? 'shield-checkmark' : 'shield-outline'} size={52} color={active ? COLORS.gold : COLORS.primaryLight} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.statusText, active && styles.statusTextActive]}>{statusText}</Text>
          {modelName.length > 0 && <Text style={styles.modelLabel}>{modelName}</Text>}

          {liveTranscript.length > 0 && (
            <View style={styles.transcriptBubble}>
              <Ionicons name="ear-outline" size={14} color={COLORS.primaryLight} />
              <Text style={styles.transcriptText} numberOfLines={2}>{liveTranscript}</Text>
            </View>
          )}
          {analyzing && (
            <View style={styles.analyzingPill}>
              <Ionicons name="pulse-outline" size={14} color={COLORS.gold} />
              <Text style={styles.analyzingText}>Processing...</Text>
            </View>
          )}

          <Text style={styles.toggleHint}>
            {ready ? (active ? 'Tap shield to deactivate' : 'Tap shield to start listening') : 'Connecting...'}
          </Text>

          <TouchableOpacity style={[styles.overlayBtn, overlayEnabled && styles.overlayBtnActive]} onPress={toggleOverlay}>
            <Ionicons name={overlayEnabled ? 'layers' : 'layers-outline'} size={18} color={overlayEnabled ? COLORS.gold : COLORS.textDim} />
            <Text style={[styles.overlayBtnText, overlayEnabled && styles.overlayBtnTextActive]}>
              {!overlayPermission ? 'Enable Overlay' : (overlayEnabled ? 'Overlay Active' : 'Show Overlay')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.alertsScroll} contentContainerStyle={styles.alertsContent}>
          {alerts.length > 0 && (
            <View style={styles.alertsHeader}>
              <Text style={styles.alertsTitle}>Recent Scans</Text>
              <TouchableOpacity onPress={clearAlerts} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={16} color={COLORS.textDim} />
              </TouchableOpacity>
            </View>
          )}
          {alerts.map((alert) => (
            <View key={alert.id} style={[styles.alertCard, alert.result.danger ? styles.alertDanger : styles.alertSafe]}>
              <View style={styles.alertIconRow}>
                <Ionicons name={alert.result.danger ? 'warning' : 'checkmark-circle'} size={18} color={alert.result.danger ? COLORS.danger : COLORS.safe} />
                <Text style={[styles.alertLabel, { color: alert.result.danger ? COLORS.danger : COLORS.safe }]}>
                  {alert.result.danger ? 'THREAT' : 'SAFE'}
                </Text>
                <Text style={styles.alertConfidence}>{Math.round(alert.result.confidence * 100)}%</Text>
              </View>
              <Text style={styles.alertReasoning}>{alert.result.reasoning}</Text>
              <Text style={styles.alertTranscript} numberOfLines={1}>{alert.transcript}</Text>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.footer}>Local AI via OLLAMA</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  gradient: { flex: 1 },
  dangerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.danger, zIndex: 100 },

  topBar: { alignItems: 'center', paddingTop: Platform.OS === 'android' ? 50 : 58, paddingBottom: 0 },
  appName: { fontSize: 34, fontWeight: '200', color: COLORS.text, letterSpacing: 12 },
  tagline: { fontSize: 10, color: COLORS.textDim, letterSpacing: 3, marginTop: 2, textTransform: 'uppercase' },

  centerArea: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  haloContainer: { width: HALO_SIZE + 50, height: HALO_SIZE + 50, alignItems: 'center', justifyContent: 'center' },
  outerRing: { position: 'absolute', width: HALO_SIZE + 40, height: HALO_SIZE + 40, borderRadius: (HALO_SIZE + 40) / 2, borderWidth: 1, borderColor: COLORS.primaryGlow },
  haloGlow: { position: 'absolute', width: HALO_SIZE + 14, height: HALO_SIZE + 14, borderRadius: (HALO_SIZE + 14) / 2, backgroundColor: COLORS.primaryGlow },
  haloCore: { width: HALO_SIZE, height: HALO_SIZE, borderRadius: HALO_SIZE / 2, backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primaryMuted },
  haloCoreActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(212, 168, 76, 0.04)' },

  statusText: { fontSize: 15, color: COLORS.textDim, marginTop: 14, fontWeight: '300', letterSpacing: 1 },
  statusTextActive: { color: COLORS.text },
  modelLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' },

  transcriptBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginTop: 12, maxWidth: width * 0.85 },
  transcriptText: { fontSize: 12, color: COLORS.textDim, marginLeft: 8, fontStyle: 'italic', flex: 1 },
  analyzingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCardActive, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginTop: 10 },
  analyzingText: { fontSize: 11, color: COLORS.gold, marginLeft: 6, fontWeight: '500' },
  toggleHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 12, letterSpacing: 0.5 },

  overlayBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.textMuted },
  overlayBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(212, 168, 76, 0.08)' },
  overlayBtnText: { fontSize: 12, color: COLORS.textDim, marginLeft: 8, fontWeight: '500' },
  overlayBtnTextActive: { color: COLORS.gold },

  alertsScroll: { flex: 1 },
  alertsContent: { paddingHorizontal: 20, paddingBottom: 8 },
  alertsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  alertsTitle: { fontSize: 11, color: COLORS.textDim, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5 },
  alertCard: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  alertDanger: { backgroundColor: COLORS.dangerBg },
  alertSafe: { backgroundColor: COLORS.safeBg },
  alertIconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  alertLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginLeft: 6, flex: 1 },
  alertConfidence: { fontSize: 11, color: COLORS.textDim, fontWeight: '600' },
  alertReasoning: { fontSize: 13, color: COLORS.text, lineHeight: 18, marginBottom: 3 },
  alertTranscript: { fontSize: 10, color: COLORS.textMuted, fontStyle: 'italic' },
  footer: { textAlign: 'center', fontSize: 9, color: COLORS.textMuted, paddingBottom: 22, letterSpacing: 1 },
});
