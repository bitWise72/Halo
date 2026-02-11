import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NeuroReflex } from './src/services/NeuroReflex';
import { VoiceService } from './src/services/VoiceService';
import { COLORS } from './src/theme/colors';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'halo';
  type: 'normal' | 'danger' | 'safe';
  timestamp: Date;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [statusText, setStatusText] = useState('Awakening...');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDanger, setIsDanger] = useState(false);
  const [partialText, setPartialText] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const dangerAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    startPulseAnimation();
    startGlowAnimation();
    requestPermissions();
    init();

    return () => {
      VoiceService.cleanup();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      } catch (e) {
        console.log('Permission request failed');
      }
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  };

  const startGlowAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.8, duration: 3000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  };

  const triggerDangerAnimation = () => {
    setIsDanger(true);
    Animated.sequence([
      Animated.timing(dangerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(dangerAnim, { toValue: 0.6, duration: 200, useNativeDriver: true }),
      Animated.timing(dangerAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const init = async () => {
    setStatusText('Connecting to the divine...');
    const sdkInit = await NeuroReflex.initialize();
    if (sdkInit) {
      setStatusText('Reaching out to Llama...');
      const modelLoaded = await NeuroReflex.loadReflexModel();
      if (modelLoaded) {
        setReady(true);
        setStatusText('Guardian Active');
        addMessage('I am Halo, your invisible guardian angel. Speak or type anything you want me to analyze for threats.', 'halo', 'normal');
      } else {
        setStatusText('Cannot connect to OLLAMA');
        addMessage('I could not connect to the local AI. Please ensure OLLAMA is running and adb reverse is active.', 'halo', 'danger');
      }
    }

    VoiceService.setup(
      (text: string) => {
        setPartialText('');
        setInputText(text);
        setIsListening(false);
      },
      (text: string) => {
        setPartialText(text);
      },
      (error: string) => {
        console.log('Voice error: ' + error);
        setIsListening(false);
        setPartialText('');
      }
    );
  };

  const addMessage = (text: string, sender: 'user' | 'halo', type: 'normal' | 'danger' | 'safe') => {
    const msg: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      sender,
      type,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!ready || !text || loading) return;

    addMessage(text, 'user', 'normal');
    setInputText('');
    setLoading(true);
    setStatusText('Analyzing...');

    const result = await NeuroReflex.processSignal(text);

    if (result.danger) {
      triggerDangerAnimation();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const alertMsg = 'ALERT: ' + result.reasoning + ' (Confidence: ' + Math.round(result.confidence * 100) + '%)';
      addMessage(alertMsg, 'halo', 'danger');
      setStatusText('Threat Detected');
      VoiceService.speak('Warning. ' + result.reasoning, true);
    } else {
      setIsDanger(false);
      dangerAnim.setValue(0);
      addMessage(result.reasoning, 'halo', 'safe');
      setStatusText('Guardian Active');
    }
    setLoading(false);
  };

  const handleVoiceToggle = async () => {
    if (isListening) {
      await VoiceService.stopListening();
      setIsListening(false);
      setPartialText('');
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsListening(true);
      setPartialText('');
      await VoiceService.startListening();
    }
  };

  const handleChat = async () => {
    const text = inputText.trim();
    if (!ready || !text || loading) return;

    addMessage(text, 'user', 'normal');
    setInputText('');
    setLoading(true);

    const response = await NeuroReflex.chat(text);
    addMessage(response, 'halo', 'normal');
    setLoading(false);
  };

  const renderMessage = (msg: Message) => {
    const isUser = msg.sender === 'user';
    const bgColor = msg.type === 'danger' ? COLORS.danger
      : msg.type === 'safe' ? COLORS.safe
        : isUser ? COLORS.primary : COLORS.cardBg;
    const textColor = (msg.type === 'danger' || msg.type === 'safe' || isUser) ? COLORS.white : COLORS.text;

    return (
      <View key={msg.id} style={[styles.messageBubble, isUser ? styles.userBubble : styles.haloBubble]}>
        {!isUser && (
          <View style={styles.haloAvatar}>
            <Text style={styles.haloAvatarText}>H</Text>
          </View>
        )}
        <View style={[styles.messageContent, { backgroundColor: bgColor }]}>
          <Text style={[styles.messageText, { color: textColor }]}>{msg.text}</Text>
        </View>
      </View>
    );
  };

  const dangerOverlayOpacity = dangerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <Animated.View
        style={[styles.dangerOverlay, { opacity: dangerOverlayOpacity }]}
        pointerEvents="none"
      />

      <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd, COLORS.background]} style={styles.gradient}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Animated.View style={[styles.haloRingOuter, { transform: [{ scale: pulseAnim }] }]}>
              <Animated.View style={[styles.haloRingGlow, { opacity: glowAnim }]} />
              <View style={styles.haloRingInner}>
                <Text style={styles.haloIcon}>H</Text>
              </View>
            </Animated.View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Halo</Text>
              <Text style={styles.subtitle}>Your Invisible Guardian Angel</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, ready ? styles.statusActive : styles.statusInactive]}>
            <View style={[styles.statusDot, ready ? styles.dotActive : styles.dotInactive]} />
            <Text style={[styles.statusLabel, ready ? styles.statusLabelActive : styles.statusLabelInactive]}>{statusText}</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          {loading && (
            <View style={[styles.messageBubble, styles.haloBubble]}>
              <View style={styles.haloAvatar}>
                <Text style={styles.haloAvatarText}>H</Text>
              </View>
              <View style={[styles.messageContent, { backgroundColor: COLORS.cardBg }]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {isListening && (
          <View style={styles.listeningBar}>
            <View style={styles.listeningPulse} />
            <Text style={styles.listeningText}>{partialText || 'Listening...'}</Text>
          </View>
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="Type or speak to Halo..."
            placeholderTextColor={COLORS.textLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.voiceBtn, isListening && styles.voiceBtnActive]}
            onPress={handleVoiceToggle}
          >
            <Text style={styles.voiceBtnIcon}>{isListening ? '||' : 'M'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendBtn, (!ready || !inputText.trim() || loading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!ready || !inputText.trim() || loading}
          >
            <Text style={styles.sendBtnIcon}>A</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chatBtn, (!ready || !inputText.trim() || loading) && styles.sendBtnDisabled]}
            onPress={handleChat}
            disabled={!ready || !inputText.trim() || loading}
          >
            <Text style={styles.chatBtnIcon}>C</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1 },
  dangerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.danger,
    zIndex: 10,
  },

  header: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  haloRingOuter: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloRingGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    backgroundColor: COLORS.haloGlow,
  },
  haloRingInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.goldLight,
  },
  haloIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerText: {
    marginLeft: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusActive: { backgroundColor: 'rgba(76, 175, 125, 0.12)' },
  statusInactive: { backgroundColor: 'rgba(232, 84, 84, 0.12)' },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotActive: { backgroundColor: COLORS.safe },
  dotInactive: { backgroundColor: COLORS.danger },
  statusLabel: { fontSize: 13, fontWeight: '600' },
  statusLabelActive: { color: COLORS.safe },
  statusLabelInactive: { color: COLORS.danger },

  chatArea: { flex: 1 },
  chatContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  haloBubble: {
    justifyContent: 'flex-start',
  },
  haloAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: COLORS.goldLight,
  },
  haloAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  messageContent: {
    maxWidth: width * 0.72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },

  listeningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(139, 127, 212, 0.08)',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  listeningPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
    marginRight: 10,
  },
  listeningText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },

  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 28,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 127, 212, 0.1)',
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    marginRight: 8,
  },
  voiceBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  voiceBtnActive: {
    backgroundColor: COLORS.danger,
  },
  voiceBtnIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
  },
  chatBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtnIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
  },
});
