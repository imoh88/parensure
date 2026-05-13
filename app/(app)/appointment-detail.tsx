import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { F } from '@/lib/fonts';
import { appointmentCache } from '@/lib/utils/appointmentCache';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, Building, Calendar, Call, Location, Sms } from 'iconsax-react-native';
import React, { useCallback } from 'react';
import {
  BackHandler,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function formatApptDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
}

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const appt = appointmentCache.get() as any;

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => sub.remove();
  }, [router]));

  if (!appt) {
    return (
      <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
        <View style={s.center}>
          <Text style={s.errorText}>Appointment not found.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const handleBack = () => router.back();

  const handleEdit = () => {
    router.push({ pathname: '/(app)/add-appointment', params: { apptId: appt._id ?? appt.id, from: '/(app)/appointment-detail' } });
  };

  const handleDirections = () => {
    if (appt.location) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.location)}`;
      Linking.openURL(url);
    }
  };

  const isHigh = appt.priority === 'HIGH';
  const timeLabel = appt.scheduledTimes?.[0] ?? '—';

  return (
    <ScreenWrapper bg="#FFFFFF" avoidKeyboard={false}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Appointments</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Title + badge */}
        <Text style={s.title}>{appt.title}</Text>
        {isHigh && (
          <View style={s.criticalBadge}>
            <Text style={s.criticalText}>CRITICAL</Text>
          </View>
        )}

        {/* Provider + location meta */}
        <View style={s.metaBlock}>
          {appt.providerName ? (
            <View style={s.metaRow}>
              <Building size={16} color="#9CA3AF" variant="Linear" />
              <Text style={s.metaText}>{appt.providerName}</Text>
            </View>
          ) : null}
          {appt.location ? (
            <View style={s.metaRow}>
              <Location size={16} color="#9CA3AF" variant="Linear" />
              <Text style={s.metaText}>{appt.location}</Text>
            </View>
          ) : null}
        </View>

        {/* Edit icon */}
        <TouchableOpacity style={s.editIconBtn} onPress={handleEdit} activeOpacity={0.7}>
          <Text style={s.editLink}>Edit</Text>
        </TouchableOpacity>

        {/* Time & Duration Section */}
        <View style={s.timeSectionCard}>
          <Text style={s.timeSectionTitle}>Time & Duration</Text>

          {/* Primary time display */}
          <View style={s.timeTrigger}>
            <View style={s.timeTriggerLeft}>
              <Text style={s.timeTriggerValue}>{timeLabel}</Text>
              <Text style={s.timeTriggerHint}>Scheduled time</Text>
            </View>
            <View style={s.timeTriggerBadge}>
              <Text style={s.timeTriggerBadgeText}>🕐</Text>
            </View>
          </View>

          {/* All scheduled times as chips */}
          {appt.scheduledTimes && appt.scheduledTimes.length > 1 && (
            <View style={s.timeChipsRow}>
              {appt.scheduledTimes.map((t: string, i: number) => (
                <View key={i} style={s.timeChip}>
                  <Text style={s.timeChipText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Start / End date row */}
          <View style={s.datesRow}>
            <View style={s.dateField}>
              <Text style={s.dateFieldLabel}>Start Date</Text>
              <View style={[s.dateInput, appt.startDate && s.dateInputFilled]}>
                <View style={s.dateInputInner}>
                  <Calendar size={14} color={appt.startDate ? '#E53935' : '#9CA3AF'} variant="Linear" />
                  <Text style={[s.dateText, !appt.startDate && s.datePlaceholder]}>
                    {appt.startDate ? formatApptDate(appt.startDate) : 'Not set'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={s.dateField}>
              <Text style={s.dateFieldLabel}>End Date</Text>
              <View style={[s.dateInput, appt.endDate && s.dateInputFilled]}>
                <View style={s.dateInputInner}>
                  <Calendar size={14} color={appt.endDate ? '#E53935' : '#9CA3AF'} variant="Linear" />
                  <Text style={[s.dateText, !appt.endDate && s.datePlaceholder]}>
                    {appt.endDate ? formatApptDate(appt.endDate) : 'Not set'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Frequency */}
          {appt.frequency && (
            <View style={s.freqRow}>
              {(['ONE_TIME', 'DAILY', 'WEEKLY'] as const).map((f) => (
                <View key={f} style={[s.freqBtn, appt.frequency === f && s.freqBtnActive]}>
                  <Text style={[s.freqBtnText, appt.frequency === f && s.freqBtnTextActive]}>
                    {f === 'ONE_TIME' ? 'One-time' : f === 'DAILY' ? 'Daily' : 'Weekly'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Location section */}
        {appt.location ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Location</Text>
            <View style={s.locationCard}>
              <View style={s.locationHeader}>
                <Location size={20} color="#E53935" variant="Bold" />
                <View style={{ flex: 1 }}>
                  <Text style={s.locationName}>{appt.location}</Text>
                  {appt.locationAddress ? (
                    <Text style={s.locationAddress}>{appt.locationAddress}</Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity style={s.directionsBtn} onPress={handleDirections} activeOpacity={0.8}>
                <Text style={s.directionsBtnText}>Get Directions</Text>
              </TouchableOpacity>
              {/* Map placeholder */}
              <View style={s.mapPlaceholder}>
                <View style={s.mapGrid}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={[s.mapLine, { backgroundColor: i % 2 === 0 ? '#D1E8D1' : '#C8DCDE' }]} />
                  ))}
                </View>
                <View style={s.mapPin}>
                  <Location size={20} color="#E53935" variant="Bold" />
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Instructions */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <View style={s.sectionTitleRow}>
              <Location size={16} color="#E53935" variant="Bold" />
              <Text style={s.sectionTitle}>Instructions</Text>
            </View>
          </View>
          <View style={s.instructionsBox}>
            <Text style={s.instructionsText}>
              {appt.notes || 'No instructions provided.'}
            </Text>
          </View>
        </View>

        {/* Provider Support */}
        {appt.providerPhone ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Provider Support</Text>
            <View style={s.supportCard}>
              <TouchableOpacity
                style={s.supportRow}
                activeOpacity={0.7}
                onPress={() => appt.providerPhone && Linking.openURL(`tel:${appt.providerPhone}`)}
              >
                <View style={s.supportIconWrap}>
                  <Call size={18} color="#E53935" variant="Linear" />
                </View>
                <Text style={s.supportText}>Clinic Phone</Text>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
              <View style={s.supportDivider} />
              <TouchableOpacity style={s.supportRow} activeOpacity={0.7}>
                <View style={s.supportIconWrap}>
                  <Sms size={18} color="#E53935" variant="Linear" />
                </View>
                <Text style={s.supportText}>Message Provider</Text>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Actions */}
        <TouchableOpacity style={s.saveBtn} onPress={handleEdit} activeOpacity={0.85}>
          <Text style={s.saveBtnText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={handleBack} activeOpacity={0.7}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, fontFamily: F.i.regular, color: '#9CA3AF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#FFF',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  title: { fontSize: 32, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.8, marginTop: 16, marginBottom: 8 },
  criticalBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FEE2E2',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14,
  },
  criticalText: { fontSize: 11, fontFamily: F.m.bold, color: '#E53935', letterSpacing: 0.5 },

  metaBlock: { gap: 6, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280' },

  editIconBtn: { alignSelf: 'flex-end', marginBottom: 12, padding: 4 },

  timeSectionCard: {
    backgroundColor: '#F9FAFB', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, marginBottom: 24, gap: 4,
  },
  timeSectionTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3, marginBottom: 16 },

  timeTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 18, paddingVertical: 16,
  },
  timeTriggerLeft: { gap: 2 },
  timeTriggerValue: { fontSize: 22, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.5 },
  timeTriggerHint: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF' },
  timeTriggerBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
  },
  timeTriggerBadgeText: { fontSize: 22 },

  timeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 50,
    borderWidth: 1, borderColor: '#FCA5A5',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  timeChipText: { fontSize: 12, fontFamily: F.m.semiBold, color: '#E53935' },

  datesRow: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 12 },
  dateField: { flex: 1 },
  dateFieldLabel: { fontSize: 12, fontFamily: F.m.semiBold, color: '#6B7280', marginBottom: 6 },
  dateInput: {
    backgroundColor: '#FFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  dateInputFilled: { borderColor: '#E53935', backgroundColor: '#FEF2F2' },
  dateInputInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 12, fontFamily: F.i.regular, color: '#111', flex: 1 },
  datePlaceholder: { color: '#C4C4C4' },

  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  freqBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  freqBtnActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  freqBtnText: { fontSize: 12, fontFamily: F.m.semiBold, color: '#6B7280' },
  freqBtnTextActive: { color: '#FFF' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontFamily: F.m.bold, color: '#111', marginBottom: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editLink: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },

  locationCard: { backgroundColor: '#F9FAFB', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  locationHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  locationName: { fontSize: 15, fontFamily: F.m.bold, color: '#111' },
  locationAddress: { fontSize: 12, fontFamily: F.i.regular, color: '#6B7280', marginTop: 2, lineHeight: 17 },
  directionsBtn: {
    marginHorizontal: 14, marginBottom: 14,
    borderRadius: 50, borderWidth: 1.5, borderColor: '#E53935',
    paddingVertical: 12, alignItems: 'center',
  },
  directionsBtnText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },
  mapPlaceholder: {
    height: 140, backgroundColor: '#C8DCDE',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  mapGrid: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', flexWrap: 'wrap' },
  mapLine: { width: '50%', height: 3, marginVertical: 14, opacity: 0.7 },
  mapPin: { position: 'absolute' },

  instructionsBox: {
    backgroundColor: '#FEF3EC', borderRadius: 14, padding: 16,
    borderLeftWidth: 3, borderLeftColor: '#F59E0B',
  },
  instructionsText: { fontSize: 14, fontFamily: F.i.regular, color: '#374151', lineHeight: 22 },

  supportCard: { backgroundColor: '#F3F4F6', borderRadius: 16, overflow: 'hidden' },
  supportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  supportIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  supportText: { flex: 1, fontSize: 15, fontFamily: F.m.semiBold, color: '#111' },
  chevron: { fontSize: 20, color: '#9CA3AF' },
  supportDivider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 16 },

  saveBtn: {
    backgroundColor: '#E53935', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#FFF', fontFamily: F.m.bold, fontSize: 16 },
  cancelBtn: {
    borderRadius: 50, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#E53935',
  },
  cancelBtnText: { color: '#E53935', fontFamily: F.m.semiBold, fontSize: 15 },
});
