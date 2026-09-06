import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  formatDistanceKm,
  formatRunDuration,
  getRouteDetailWithCoordinates,
  fetchLiveRouteDetail,
  MobileRouteDetail,
} from '../../services/routeService';
import {
  RunSessionController,
  RunSessionSummary,
} from '../../services/runSession';
import {
  BackgroundLocationManager,
  LocationData,
} from '../../services/backgroundLocation';
import { NativeAudioGuide } from '../../services/nativeAudioService';
import {
  NativeExpoLocationAdapter,
  NativeExpoSpeechEngine,
} from '../../services/expoAdapters';
import { TurnType } from '@rute-unik/shared';
import { LiveRouteTracker } from '../../components/LiveRouteTracker';
import { RouteShapePreview } from '../../components/RouteShapePreview';
import { TurnDirectionIcon } from '../../components/TurnDirectionIcon';
import { useTheme } from '../../services/themeContext';

export default function RunModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme, mode, toggleTheme } = useTheme();

  const [route, setRoute] = useState<MobileRouteDetail>(() =>
    getRouteDetailWithCoordinates(id ?? 'kucing-ugm')
  );

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    async function load() {
      try {
        const liveDetail = await fetchLiveRouteDetail(id);
        if (isMounted) {
          setRoute(liveDetail);
        }
      } catch {}
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [distanceCoveredMeters, setDistanceCoveredMeters] = useState(0);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [currentPace, setCurrentPace] = useState('-:--');
  const [upcomingTurn, setUpcomingTurn] = useState<{
    turnType: TurnType | 'start' | 'finish' | 'off_route';
    direction: string;
    distanceMeters: number;
    instruction: string;
  }>({
    turnType: 'start',
    direction: 'Mulai Lari',
    distanceMeters: 0,
    instruction: 'Menunggu pergerakan pertama...',
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<
    'requesting' | 'active' | 'denied' | 'simulated'
  >('requesting');
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [sessionSummary, setSessionSummary] =
    useState<RunSessionSummary | null>(null);
  const [runnerLocation, setRunnerLocation] = useState<[number, number] | null>(
    () => route.coordinates?.[0] ?? null
  );
  const [closestCoordIndex, setClosestCoordIndex] = useState<number>(0);

  const sessionRef = useRef<RunSessionController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const simStepRef = useRef(0);
  // Initialize or update the RunSessionController
  useEffect(() => {
    const audioGuide = new NativeAudioGuide({
      config: { language: language === 'id' ? 'id-ID' : 'en-US' },
      speechEngine: new NativeExpoSpeechEngine(),
    });
    const locationManager = new BackgroundLocationManager({
      adapter: new NativeExpoLocationAdapter(),
    });

    const controller = new RunSessionController({
      routeId: route.id,
      routeName: route.name,
      routeCoords: route.coordinates,
      turnCues: route.turnCues,
      language,
      audioGuide,
      locationManager,
    });
    sessionRef.current = controller;

    return () => {
      controller.finishRun().catch(() => {});
    };
  }, [route, language]);

  // Handle incoming location update from real GPS or simulation
  const handleLocationTick = useCallback(
    (loc: LocationData) => {
      const controller = sessionRef.current;
      if (!controller) return;

      const result = controller.handleLocationUpdate(loc);
      setRunnerLocation([loc.longitude, loc.latitude]);
      if (typeof result.closestCoordinateIndex === 'number') {
        setClosestCoordIndex(result.closestCoordinateIndex);
      }
      setGpsAccuracy(loc.accuracy);
      setDistanceCoveredMeters(result.distanceCoveredMeters);
      setCurrentPace(
        controller.calculatePaceString(
          result.distanceCoveredMeters,
          controller.getElapsedSeconds()
        )
      );
      setIsOffRoute(result.isOffRoute);

      if (result.nextTurnCue && result.distanceToNextTurnMeters !== null) {
        setUpcomingTurn({
          turnType: result.nextTurnCue.turnType,
          direction:
            language === 'id'
              ? result.nextTurnCue.instructions.id.action
              : result.nextTurnCue.instructions.en.action,
          distanceMeters: Math.round(result.distanceToNextTurnMeters),
          instruction:
            language === 'id'
              ? result.nextTurnCue.instructions.id.advance
              : result.nextTurnCue.instructions.en.advance,
        });
      }

      if (result.nextState?.isCompleted) {
        setIsCompleted(true);
        setUpcomingTurn({
          turnType: 'finish',
          direction: language === 'id' ? 'Selesai!' : 'Finished!',
          distanceMeters: 0,
          instruction:
            language === 'id'
              ? 'Anda berhasil mencapai garis finish!'
              : 'You have reached the finish line!',
        });
      }
    },
    [language]
  );

  // Request real GPS permissions and start tracking
  useEffect(() => {
    let isMounted = true;
    let locationSub: Location.LocationSubscription | null = null;

    async function initGps() {
      if (isSimulationMode) {
        setGpsStatus('simulated');
        return;
      }

      try {
        setGpsStatus('requesting');
        const fg = await Location.requestForegroundPermissionsAsync();

        if (!isMounted) return;

        if (fg.status !== 'granted') {
          setGpsStatus('denied');
          Alert.alert(
            'Izin Lokasi Diperlukan',
            'Rute Unik membutuhkan akses GPS untuk memandu rute lari dan belokan Anda. Anda dapat mengaktifkannya di Pengaturan, atau mencoba Mode Simulasi untuk pratinjau rute.',
            [
              {
                text: 'Mode Simulasi (Demo)',
                onPress: () => {
                  setIsSimulationMode(true);
                  setGpsStatus('simulated');
                },
              },
              { text: 'Oke', style: 'cancel' },
            ]
          );
          return;
        }

        setGpsStatus('active');
        const controller = sessionRef.current;
        if (controller) {
          await controller.startRun();
        }

        locationSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (loc) => {
            if (!isMounted) return;
            handleLocationTick({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy ?? 10,
              altitude: loc.coords.altitude,
              speed: loc.coords.speed,
              heading: loc.coords.heading,
              timestamp: loc.timestamp,
            });
          }
        );
      } catch {
        if (!isMounted) return;
        setGpsStatus('denied');
      }
    }

    initGps();

    return () => {
      isMounted = false;
      if (locationSub) {
        locationSub.remove();
      }
    };
  }, [isSimulationMode, handleLocationTick]);

  // Stopwatch timer & optional simulation runner
  useEffect(() => {
    if (!isPaused && !isCompleted) {
      timerRef.current = setInterval(() => {
        const controller = sessionRef.current;
        if (controller) {
          setElapsedSeconds(controller.getElapsedSeconds());
        }

        // If in simulation mode, advance simulated runner along route coords
        if (isSimulationMode && route.coordinates.length > 0) {
          simStepRef.current =
            (simStepRef.current + 1) % route.coordinates.length;
          const coord = route.coordinates[simStepRef.current];
          handleLocationTick({
            longitude: coord[0],
            latitude: coord[1],
            accuracy: 4,
            timestamp: Date.now(),
          });
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    isPaused,
    isCompleted,
    isSimulationMode,
    route.coordinates,
    handleLocationTick,
  ]);

  const completionPercent = Math.min(
    100,
    Math.round(
      (distanceCoveredMeters / Math.max(1, route.distanceMeters)) * 100
    )
  );

  const togglePause = () => {
    const controller = sessionRef.current;
    if (isPaused) {
      controller?.resumeRun();
      setIsPaused(false);
    } else {
      controller?.pauseRun();
      setIsPaused(true);
    }
  };

  const handleFinish = () => {
    Alert.alert(
      'Selesaikan Lari?',
      'Apakah Anda ingin mengakhiri sesi lari GPS Art ini?',
      [
        { text: 'Lanjut Lari', style: 'cancel' },
        {
          text: 'Selesai',
          style: 'destructive',
          onPress: async () => {
            const controller = sessionRef.current;
            if (controller) {
              const res = await controller.finishRun();
              setSessionSummary(res);
            }
            setIsCompleted(true);
          },
        },
      ]
    );
  };

  const handleExit = () => {
    if (isCompleted) {
      router.replace('/');
      return;
    }

    Alert.alert(
      'Keluar dari Mode Lari?',
      'Progres lari saat ini tidak akan disimpan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: () => {
            sessionRef.current?.finishRun().catch(() => {});
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.paper }]}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={[styles.topRouteName, { color: theme.ink }]}>
              {route.name}
            </Text>
            <View style={styles.gpsRow}>
              <View
                style={[
                  styles.gpsDot,
                  gpsStatus === 'active'
                    ? styles.gpsDotActive
                    : gpsStatus === 'denied'
                      ? styles.gpsDotDenied
                      : styles.gpsDotSim,
                ]}
              />
              <Text style={[styles.gpsText, { color: theme.inkMuted }]}>
                {gpsStatus === 'active'
                  ? `GPS Aktif • Akurasi ±${Math.round(gpsAccuracy ?? 5)}m`
                  : gpsStatus === 'simulated'
                    ? 'Mode Demo / Simulasi'
                    : gpsStatus === 'denied'
                      ? 'Izin Lokasi Belum Diizinkan'
                      : 'Mencari Sinyal GPS...'}
              </Text>
            </View>
          </View>

          <View style={styles.topRightActions}>
            {/* 1-Tap Theme Toggle */}
            <TouchableOpacity
              style={[
                styles.themeButton,
                {
                  backgroundColor: theme.chalk,
                  borderColor: theme.cardBorder,
                },
              ]}
              onPress={toggleTheme}
            >
              <Text style={[styles.themeButtonText, { color: theme.ink }]}>
                {mode === 'light' ? '☀️' : '🌙'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                {
                  backgroundColor: isSimulationMode
                    ? (mode === 'light' ? '#E0E7FF' : '#1e3a8a')
                    : theme.chalk,
                  borderColor: isSimulationMode ? '#3b82f6' : theme.cardBorder,
                },
              ]}
              onPress={() => setIsSimulationMode((s) => !s)}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  {
                    color: isSimulationMode
                      ? '#2563eb'
                      : theme.ink,
                  },
                ]}
              >
                {isSimulationMode ? '🎮 Demo' : '🛰️ GPS'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langButton,
                {
                  backgroundColor: theme.chalk,
                  borderColor: theme.cardBorder,
                },
              ]}
              onPress={() => setLanguage((l) => (l === 'id' ? 'en' : 'id'))}
            >
              <Text style={[styles.langButtonText, { color: theme.ink }]}>
                {language === 'id' ? 'ID 🇮🇩' : 'EN 🇬🇧'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
              <Text style={styles.exitButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Center Dashboard */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Turn Guidance Live Card */}
          <View
            style={[
              styles.turnCard,
              {
                backgroundColor: theme.turnCardBg,
                borderColor: theme.turnCardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.turnIconBox,
                {
                  backgroundColor: isOffRoute
                    ? (mode === 'light' ? '#FEE2E2' : '#2b1212')
                    : upcomingTurn.turnType === 'finish'
                      ? (mode === 'light' ? '#DCFCE7' : '#12331f')
                      : theme.turnIconBoxBg,
                  borderColor: isOffRoute
                    ? '#EF4444'
                    : upcomingTurn.turnType === 'finish'
                      ? '#10b981'
                      : theme.turnIconBoxBorder,
                },
              ]}
            >
              <TurnDirectionIcon
                turnType={isOffRoute ? 'off_route' : upcomingTurn.turnType}
                size={32}
                color={
                  isOffRoute
                    ? '#ef4444'
                    : upcomingTurn.turnType === 'finish'
                      ? (mode === 'light' ? theme.moss : '#10b981')
                      : upcomingTurn.turnType === 'u_turn'
                        ? '#f59e0b'
                        : (mode === 'light' ? theme.trailOrange : '#34d399')
                }
                strokeWidth={3.8}
              />
            </View>
            <View style={styles.turnTextBox}>
              <Text
                style={[
                  styles.turnDistanceText,
                  {
                    color:
                      mode === 'light'
                        ? theme.ink
                        : '#34d399',
                  },
                ]}
              >
                {upcomingTurn.direction}
                {upcomingTurn.distanceMeters > 0
                  ? ` dlm ${upcomingTurn.distanceMeters}m`
                  : ''}
              </Text>
              <Text
                style={[
                  styles.turnInstructionText,
                  { color: theme.inkMuted },
                ]}
              >
                {upcomingTurn.instruction}
              </Text>
            </View>
          </View>

          {/* Off-Route Warning */}
          {isOffRoute && (
            <View style={styles.offRouteBanner}>
              <Text style={styles.offRouteIcon}>⚠️</Text>
              <Text style={styles.offRouteText}>
                KELUAR DARI JALUR! Putar balik ke arah rute.
              </Text>
            </View>
          )}

          {/* Live GPS Art Shape Canvas & Runner Position Tracker */}
          <View
            style={[
              styles.liveTrackerBox,
              {
                backgroundColor: theme.chalkSubtle,
                borderColor: theme.contourTan,
              },
            ]}
          >
            <LiveRouteTracker
              routeCoords={route.coordinates}
              runnerLocation={runnerLocation}
              closestIndex={closestCoordIndex}
              size={185}
              isOffRoute={isOffRoute}
            />
          </View>

          {/* Big HUD Metrics Grid */}
          <View style={styles.hudGrid}>
            {/* Timer Card */}
            <View
              style={[
                styles.hudCard,
                {
                  backgroundColor: theme.hudCardBg,
                  borderColor: theme.hudCardBorder,
                },
              ]}
            >
              <Text style={[styles.hudLabel, { color: theme.inkMuted }]}>
                WAKTU
              </Text>
              <Text
                style={[
                  styles.hudTimer,
                  {
                    color:
                      mode === 'light'
                        ? theme.trailOrange
                        : '#34d399',
                  },
                ]}
              >
                {formatRunDuration(elapsedSeconds)}
              </Text>
              <Text style={[styles.hudSub, { color: theme.inkMuted }]}>
                {isPaused ? 'DIJEDA' : 'BERJALAN'}
              </Text>
            </View>

            {/* Distance Card */}
            <View
              style={[
                styles.hudCard,
                {
                  backgroundColor: theme.hudCardBg,
                  borderColor: theme.hudCardBorder,
                },
              ]}
            >
              <Text style={[styles.hudLabel, { color: theme.inkMuted }]}>
                JARAK
              </Text>
              <Text style={[styles.hudMetric, { color: theme.ink }]}>
                {formatDistanceKm(distanceCoveredMeters)}
              </Text>
              <Text style={[styles.hudSub, { color: theme.inkMuted }]}>
                dari {formatDistanceKm(route.distanceMeters)}
              </Text>
            </View>

            {/* Pace Card */}
            <View
              style={[
                styles.hudCard,
                {
                  backgroundColor: theme.hudCardBg,
                  borderColor: theme.hudCardBorder,
                },
              ]}
            >
              <Text style={[styles.hudLabel, { color: theme.inkMuted }]}>
                PACE RATA-RATA
              </Text>
              <Text style={[styles.hudMetric, { color: theme.ink }]}>
                {currentPace}
              </Text>
              <Text style={[styles.hudSub, { color: theme.inkMuted }]}>
                min / km
              </Text>
            </View>

            {/* Completion % Card */}
            <View
              style={[
                styles.hudCard,
                {
                  backgroundColor: theme.hudCardBg,
                  borderColor: theme.hudCardBorder,
                },
              ]}
            >
              <Text style={[styles.hudLabel, { color: theme.inkMuted }]}>
                PROGRES BENTUK
              </Text>
              <Text style={[styles.hudMetric, { color: theme.ink }]}>
                {completionPercent}%
              </Text>
              <Text style={[styles.hudSub, { color: theme.inkMuted }]}>
                {route.shapeCategory.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Shape Completion Progress Bar */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBarBackground,
                { backgroundColor: theme.progressBg },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${completionPercent}%`,
                    backgroundColor: theme.progressFill,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, { color: theme.inkMuted }]}>
              Penyelesaian Bentuk GPS Art: {completionPercent}%
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Control Buttons */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[
              styles.pauseButton,
              {
                backgroundColor: isPaused
                  ? theme.moss
                  : theme.chalk,
                borderColor: theme.cardBorder,
              },
            ]}
            activeOpacity={0.85}
            onPress={togglePause}
          >
            <Text
              style={[
                styles.pauseButtonText,
                { color: isPaused ? theme.chalk : theme.ink },
              ]}
            >
              {isPaused ? '▶️ LANJUT (RESUME)' : '⏸ JEDA (PAUSE)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finishButton}
            activeOpacity={0.85}
            onPress={handleFinish}
          >
            <Text style={styles.finishButtonText}>SELESAI 🏁</Text>
          </TouchableOpacity>
        </View>

        {/* Completion Modal */}
        <Modal visible={isCompleted} transparent animationType="slide">
          <View
            style={[
              styles.modalOverlay,
              {
                backgroundColor:
                  mode === 'light'
                    ? 'rgba(31, 42, 30, 0.65)'
                    : 'rgba(0,0,0,0.85)',
              },
            ]}
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.modalCardBg,
                  borderColor: theme.modalCardBorder,
                },
              ]}
            >
              <Text style={styles.modalTrophy}>🎉 🏆 🐾</Text>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color:
                      mode === 'light' ? theme.ink : '#34d399',
                  },
                ]}
              >
                Selamat! Rute Selesai!
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: theme.inkMuted }]}
              >
                Anda berhasil menyelesaikan bentuk GPS Art &quot;{route.name}&quot;!
              </Text>

              {/* Finished GPS Art Artwork Trophy Badge */}
              <View
                style={[
                  styles.modalArtworkBox,
                  {
                    backgroundColor: theme.chalkSubtle,
                    borderColor: theme.contourTan,
                  },
                ]}
              >
                <RouteShapePreview
                  svgXml={route.thumbnailSvg}
                  coordinates={route.coordinates}
                  strokeColor={theme.routeStroke}
                  strokeWidth={4}
                  size={150}
                  showEndpoints={true}
                />
              </View>

              <View
                style={[
                  styles.modalStats,
                  {
                    backgroundColor: theme.chalkSubtle,
                    borderColor: theme.contourTan,
                    borderWidth: 1,
                  },
                ]}
              >
                <View style={styles.modalStatItem}>
                  <Text
                    style={[
                      styles.modalStatLabel,
                      { color: theme.inkMuted },
                    ]}
                  >
                    Total Waktu
                  </Text>
                  <Text
                    style={[styles.modalStatVal, { color: theme.ink }]}
                  >
                    {formatRunDuration(
                      sessionSummary?.totalElapsedSeconds ?? elapsedSeconds
                    )}
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text
                    style={[
                      styles.modalStatLabel,
                      { color: theme.inkMuted },
                    ]}
                  >
                    Total Jarak
                  </Text>
                  <Text
                    style={[styles.modalStatVal, { color: theme.ink }]}
                  >
                    {formatDistanceKm(
                      sessionSummary?.coveredDistanceMeters ??
                        distanceCoveredMeters
                    )}
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text
                    style={[
                      styles.modalStatLabel,
                      { color: theme.inkMuted },
                    ]}
                  >
                    Pace
                  </Text>
                  <Text
                    style={[styles.modalStatVal, { color: theme.ink }]}
                  >
                    {sessionSummary?.averagePaceMinPerKm ?? currentPace}/km
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.modalCloseButton,
                  { backgroundColor: theme.primaryButtonBg },
                ]}
                onPress={() => router.replace('/')}
              >
                <Text
                  style={[
                    styles.modalCloseButtonText,
                    { color: theme.primaryButtonText },
                  ]}
                >
                  KEMBALI KE DIREKTORI
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070a08',
  },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  topRouteName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  gpsDotActive: {
    backgroundColor: '#10b981',
  },
  gpsDotDenied: {
    backgroundColor: '#ef4444',
  },
  gpsDotSim: {
    backgroundColor: '#3b82f6',
  },
  gpsText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeButtonText: {
    fontSize: 14,
  },
  modeButton: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modeButtonActive: {},
  modeButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  langButton: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  langButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  exitButton: {
    backgroundColor: '#261616',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonText: {
    color: '#f87171',
    fontWeight: 'bold',
    fontSize: 16,
  },
  turnCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 10,
  },
  turnIconBox: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnIconBoxOffRoute: {
    backgroundColor: '#2b1212',
    borderColor: '#5c1d1d',
  },
  turnIconBoxFinish: {
    backgroundColor: '#12331f',
    borderColor: '#1d5e37',
  },
  turnTextBox: {
    flex: 1,
  },
  turnDistanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34d399',
  },
  turnInstructionText: {
    fontSize: 13,
    color: '#d1fae5',
    marginTop: 2,
  },
  offRouteBanner: {
    backgroundColor: '#38160d',
    borderColor: '#7f1d1d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  offRouteIcon: {
    fontSize: 18,
  },
  offRouteText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  hudGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 10,
  },
  hudCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  hudLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hudTimer: {
    fontSize: 28,
    fontWeight: '900',
  },
  hudMetric: {
    fontSize: 24,
    fontWeight: '900',
  },
  hudSub: {
    fontSize: 11,
    marginTop: 4,
  },
  progressContainer: {
    marginVertical: 10,
  },
  progressBarBackground: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  bottomControls: {
    gap: 10,
    marginBottom: 8,
  },
  pauseButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  resumeButton: {},
  pauseButtonText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  finishButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalTrophy: {
    fontSize: 48,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  modalStatVal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontWeight: '800',
    fontSize: 14,
  },
  liveTrackerBox: {
    borderWidth: 1,
    borderRadius: 14,
    height: 205,
    marginVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  modalArtworkBox: {
    borderWidth: 1,
    borderRadius: 12,
    height: 165,
    marginVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  scrollArea: {
    flex: 1,
    marginVertical: 4,
  },
  scrollContent: {
    paddingBottom: 16,
  },
});
