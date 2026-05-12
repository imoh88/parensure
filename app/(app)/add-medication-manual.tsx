import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { caregiverApi } from '@/lib/api/caregiver';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDown2, ArrowLeft, ArrowUp2, Trash } from 'iconsax-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

const MED_TYPES   = ['Prescription', 'OTC', 'Supplement', 'Herbal', 'Compounded', 'Other'] as const;
const FORMS       = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Patch', 'Cream', 'Drops', 'Inhaler', 'Other'] as const;
const ROUTES      = ['Oral', 'Topical', 'Intravenous', 'Subcutaneous', 'Inhalation', 'Sublingual', 'Other'] as const;

type Frequency = 'ONE_TIME' | 'DAILY' | 'WEEKLY';
type Priority  = 'LOW' | 'NORMAL' | 'HIGH';
type IntakeMethod = 'SCHEDULED' | 'AS_NEEDED';

const FREQUENCIES: { label: string; value: Frequency }[] = [
  { label: 'One-time', value: 'ONE_TIME' },
  { label: 'Daily',    value: 'DAILY'    },
  { label: 'Weekly',   value: 'WEEKLY'   },
];

interface DoseTime { hours: number; minutes: number; period: 'AM' | 'PM' }
interface Receiver { careReceiverId: string; name: string }

function defaultDose(): DoseTime { return { hours: 8, minutes: 0, period: 'AM' }; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDoseLabel(d: DoseTime) {
  return `${d.hours}:${String(d.minutes).padStart(2, '0')} ${d.period}`;
}

function formatDateDisplay(d: Date | null) {
  if (!d) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function Dropdown({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={dd.btn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[dd.value, !value && dd.placeholder]}>{value || label}</Text>
        <ArrowDown2 size={16} color="#9CA3AF" variant="Linear" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={dd.overlay} onPress={() => setOpen(false)}>
          <View style={dd.sheet}>
            <Text style={dd.sheetTitle}>{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((o) => (
                <TouchableOpacity
                  key={o} style={[dd.option, value === o && dd.optionActive]}
                  onPress={() => { onChange(o); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[dd.optionText, value === o && dd.optionTextActive]}>{o}</Text>
                  {value === o && <Ionicons name="checkmark-circle" size={18} color="#E53935" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ value, onChange, min = 0, max = 59 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <View style={sp.wrap}>
      <TouchableOpacity onPress={() => onChange(value < max ? value + 1 : min)} activeOpacity={0.7}>
        <ArrowUp2 size={16} color="#6B7280" variant="Linear" />
      </TouchableOpacity>
      <Text style={sp.val}>{String(value).padStart(2, '0')}</Text>
      <TouchableOpacity onPress={() => onChange(value > min ? value - 1 : max)} activeOpacity={0.7}>
        <ArrowDown2 size={16} color="#6B7280" variant="Linear" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddMedicationManualScreen() {
  const router = useRouter();
  const { prefillName, prefillDosage, prefillInstructions, from } = useLocalSearchParams<{
    prefillName?: string; prefillDosage?: string; prefillInstructions?: string; from?: string;
  }>();

  const goBack = () => router.push((from as any) ?? '/(app)/add-medication');
  const { activeRole } = useAuthStore();
  const isCareReceiver = activeRole === 'CARE_RECEIVER';

  const [phase, setPhase] = useState<1 | 2>(1);

  // Care receivers
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [selectedReceiverId, setSelectedReceiverId] = useState('');
  const [showReceiverPicker, setShowReceiverPicker] = useState(false);
  const [loadingReceivers, setLoadingReceivers] = useState(true);

  const loadReceivers = useCallback(async () => {
    if (isCareReceiver) { setLoadingReceivers(false); return; }
    try {
      const res = await caregiverApi.getBookings();
      if (res.success && res.data) {
        const list: Receiver[] = (res.data as any[])
          .filter((b) => b.careReceiver?.user)
          .map((b) => ({ careReceiverId: b.careReceiverId, name: b.careReceiver?.user?.fullName ?? 'Unknown' }));
        setReceivers(list);
        if (list.length > 0 && list[0]) setSelectedReceiverId(list[0].careReceiverId);
      }
    } catch { /* silently fail */ }
    finally { setLoadingReceivers(false); }
  }, []);

  useEffect(() => { loadReceivers(); }, [loadReceivers]);

  // ── Phase 1 state ──────────────────────────────────────────────────────────
  const [name,         setName]         = useState(prefillName        ?? '');
  const [dosage,       setDosage]       = useState(prefillDosage      ?? '');
  const [medType,      setMedType]      = useState('Prescription');
  const [prescriber,   setPrescriber]   = useState('');
  const [pharmacy,     setPharmacy]     = useState('');
  const [intake,       setIntake]       = useState<IntakeMethod>('SCHEDULED');
  const [form,         setForm]         = useState('Tablet');
  const [route,        setRoute]        = useState('Oral');

  // ── Phase 2 state ──────────────────────────────────────────────────────────
  const [doses,        setDoses]        = useState<DoseTime[]>([defaultDose()]);
  const [startDate,    setStartDate]    = useState<Date | null>(null);
  const [endDate,      setEndDate]      = useState<Date | null>(null);
  const [showStart,    setShowStart]    = useState(false);
  const [showEnd,      setShowEnd]      = useState(false);
  const [reminder,     setReminder]     = useState(30);
  const [frequency,    setFrequency]    = useState<Frequency>('ONE_TIME');
  const [priority,     setPriority]     = useState<Priority>('NORMAL');
  const [instructions, setInstructions] = useState(prefillInstructions ?? '');

  const [saving, setSaving] = useState(false);

  const addDose    = () => setDoses(prev => [...prev, defaultDose()]);
  const removeDose = (i: number) => setDoses(prev => prev.filter((_, idx) => idx !== i));
  const updateDose = (i: number, key: keyof DoseTime, val: number | string) =>
    setDoses(prev => prev.map((d, idx) => idx === i ? { ...d, [key]: val } : d));

  const selectedReceiver = receivers.find((r) => r.careReceiverId === selectedReceiverId);

  const handlePhase1Continue = () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter a medication name.'); return; }
    if (!dosage.trim()) { Alert.alert('Required', 'Please enter a dosage.'); return; }
    if (!isCareReceiver && !selectedReceiverId) { Alert.alert('Required', 'Please select a care receiver.'); return; }
    setPhase(2);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const scheduledTimes = intake === 'SCHEDULED' ? doses.map(formatDoseLabel) : [];
      await caregiverApi.createTask({
        careReceiverId: selectedReceiverId,
        title: name.trim(),
        description: [
          dosage.trim(), medType, form, route,
          prescriber ? `Prescriber: ${prescriber}` : '',
          pharmacy   ? `Pharmacy: ${pharmacy}` : '',
          instructions.trim(),
        ].filter(Boolean).join(' | '),
        category: 'MEDICATION',
        scheduledTimes,
        startDate:     startDate ? startDate.toISOString() : undefined,
        endDate:       endDate   ? endDate.toISOString()   : undefined,
        frequency,
        priority,
        reminderMinutes: reminder,
      });
      router.replace({ pathname: '/(app)/medication-success', params: { medName: name.trim() } });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? e?.message ?? 'Could not save medication.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Shared header ─────────────────────────────────────────────────────────

  const header = (
    <View style={s.header}>
      <TouchableOpacity style={s.backBtn} onPress={phase === 1 ? goBack : () => setPhase(1)} activeOpacity={0.7}>
        <ArrowLeft size={22} color="#E53935" variant="Linear" />
      </TouchableOpacity>
      <Text style={s.headerTitle}>Add Medication</Text>
      <TouchableOpacity style={s.backBtn} onPress={() => {
        Alert.alert('Discard?', 'Discard this medication?', [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: goBack },
        ]);
      }} activeOpacity={0.7}>
        <Trash size={20} color="#E53935" variant="Linear" />
      </TouchableOpacity>
    </View>
  );

  // ─── Progress bar ──────────────────────────────────────────────────────────

  const progress = (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: phase === 1 ? '50%' : '100%' }]} />
    </View>
  );

  // ─── Phase 1 render ────────────────────────────────────────────────────────

  if (phase === 1) {
    return (
      <ScreenWrapper bg="#F5F5F7" avoidKeyboard={false}>
        {header}
        {progress}

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.title}>New Medication</Text>
          <Text style={s.subtitle}>
            Ensure accuracy to help provide the best care. Double-check dosage instructions with the medical professional.
          </Text>

          {/* Care Receiver (caregivers only) */}
          {!isCareReceiver && (
            <>
              <Text style={s.label}>Care Receiver</Text>
              {loadingReceivers ? (
                <ActivityIndicator color="#E53935" style={{ marginBottom: 16 }} />
              ) : (
                <TouchableOpacity style={dd.btn} onPress={() => setShowReceiverPicker(true)} activeOpacity={0.8}>
                  <Text style={[dd.value, !selectedReceiver && dd.placeholder]}>
                    {selectedReceiver?.name ?? 'Select care receiver'}
                  </Text>
                  <ArrowDown2 size={16} color="#9CA3AF" variant="Linear" />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Basic Information */}
          <Text style={s.sectionLabel}>Basic Information</Text>

          <Text style={s.label}>Medication Name</Text>
          <TextInput
            style={s.input} value={name} onChangeText={setName}
            placeholder="e.g. Lisinopril" placeholderTextColor="#C4C4C4"
          />

          <Text style={s.label}>Dosage</Text>
          <TextInput
            style={s.input} value={dosage} onChangeText={setDosage}
            placeholder="e.g. 500mg" placeholderTextColor="#C4C4C4"
          />

          <Text style={s.label}>Form</Text>
          <Dropdown label="Form" value={medType} options={MED_TYPES} onChange={setMedType} />

          <Text style={s.label}>Prescriber <Text style={s.optional}>(Optional)</Text></Text>
          <TextInput
            style={s.input} value={prescriber} onChangeText={setPrescriber}
            placeholder="" placeholderTextColor="#C4C4C4"
          />

          <Text style={s.label}>Pharmacy <Text style={s.optional}>(Optional)</Text></Text>
          <TextInput
            style={s.input} value={pharmacy} onChangeText={setPharmacy}
            placeholder="" placeholderTextColor="#C4C4C4"
          />

          {/* Intake Method */}
          <Text style={s.sectionLabelBold}>Intake Method</Text>
          <View style={s.intakeRow}>
            <TouchableOpacity
              style={[s.intakeCard, intake === 'SCHEDULED' && s.intakeCardActive]}
              onPress={() => setIntake('SCHEDULED')}
              activeOpacity={0.8}
            >
              {intake === 'SCHEDULED' && (
                <View style={s.intakeCheck}>
                  <Ionicons name="checkmark-circle" size={18} color="#E53935" />
                </View>
              )}
              <Ionicons
                name="alarm-outline"
                size={26}
                color={intake === 'SCHEDULED' ? '#E53935' : '#9CA3AF'}
              />
              <Text style={[s.intakeCardTitle, intake === 'SCHEDULED' && s.intakeCardTitleActive]}>
                Scheduled
              </Text>
              <Text style={s.intakeCardDesc}>Take at specific times throughout the day.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.intakeCard, intake === 'AS_NEEDED' && s.intakeCardActive]}
              onPress={() => setIntake('AS_NEEDED')}
              activeOpacity={0.8}
            >
              {intake === 'AS_NEEDED' && (
                <View style={s.intakeCheck}>
                  <Ionicons name="checkmark-circle" size={18} color="#E53935" />
                </View>
              )}
              <Ionicons
                name="fitness-outline"
                size={26}
                color={intake === 'AS_NEEDED' ? '#E53935' : '#9CA3AF'}
              />
              <Text style={[s.intakeCardTitle, intake === 'AS_NEEDED' && s.intakeCardTitleActive]}>
                As Needed
              </Text>
              <Text style={s.intakeCardDesc}>Take only when symptoms occur (PRN).</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Form</Text>
          <Dropdown label="Form" value={form} options={FORMS} onChange={setForm} />

          <Text style={s.label}>Route</Text>
          <Dropdown label="Route" value={route} options={ROUTES} onChange={setRoute} />

          <Text style={s.footerNote}>Parensure provides reminders only.</Text>

          <TouchableOpacity style={s.continueBtn} onPress={handlePhase1Continue} activeOpacity={0.85}>
            <Text style={s.continueBtnText}>Save &amp; Continue</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Care Receiver Picker */}
        <Modal visible={showReceiverPicker} transparent animationType="fade" onRequestClose={() => setShowReceiverPicker(false)}>
          <Pressable style={dd.overlay} onPress={() => setShowReceiverPicker(false)}>
            <View style={dd.sheet}>
              <Text style={dd.sheetTitle}>Select Care Receiver</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {receivers.length === 0 ? (
                  <Text style={s.noReceiversText}>No care receivers found. Add one from your care circle.</Text>
                ) : receivers.map((r) => (
                  <TouchableOpacity
                    key={r.careReceiverId}
                    style={[dd.option, selectedReceiverId === r.careReceiverId && dd.optionActive]}
                    onPress={() => { setSelectedReceiverId(r.careReceiverId); setShowReceiverPicker(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[dd.optionText, selectedReceiverId === r.careReceiverId && dd.optionTextActive]}>
                      {r.name}
                    </Text>
                    {selectedReceiverId === r.careReceiverId && <Ionicons name="checkmark-circle" size={18} color="#E53935" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </ScreenWrapper>
    );
  }

  // ─── Phase 2 render ────────────────────────────────────────────────────────

  return (
    <ScreenWrapper bg="#F5F5F7" avoidKeyboard={false}>
      {header}
      {progress}

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>New Medication</Text>
        <Text style={s.subtitle}>
          Ensure accuracy to help provide the best care. Double-check dosage instructions with the medical professional.
        </Text>

        {/* Dose Schedule */}
        <Text style={s.sectionLabel}>Dose Schedule</Text>
        <Text style={s.subSectionLabel}>Time &amp; Duration</Text>

        <View style={s.card}>
          {doses.map((dose, i) => (
            <View key={i}>
              {i > 0 && <View style={s.divider} />}
              <View style={s.doseRow}>
                <View style={s.doseColWrap}>
                  <Text style={s.doseColLabel}>Hours</Text>
                  <Spinner value={dose.hours}   onChange={(v) => updateDose(i, 'hours', v)}   min={1} max={12} />
                </View>
                <View style={s.doseColWrap}>
                  <Text style={s.doseColLabel}>Minutes</Text>
                  <Spinner value={dose.minutes} onChange={(v) => updateDose(i, 'minutes', v)} min={0} max={59} />
                </View>
                <TouchableOpacity
                  style={[dd.periodBtn]}
                  onPress={() => updateDose(i, 'period', dose.period === 'AM' ? 'PM' : 'AM')}
                  activeOpacity={0.8}
                >
                  <Text style={dd.value}>{dose.period}</Text>
                  <ArrowDown2 size={14} color="#9CA3AF" variant="Linear" />
                </TouchableOpacity>
                {doses.length > 1 && (
                  <TouchableOpacity onPress={() => removeDose(i)} activeOpacity={0.7} style={s.removeBtn}>
                    <Ionicons name="close-circle" size={20} color="#E53935" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {/* Start / End date */}
          <View style={s.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.dateLabel}>Start Date</Text>
              {Platform.OS === 'ios' ? (
                <View style={s.dateInput}>
                  <DateTimePicker
                    value={startDate ?? new Date()}
                    mode="date"
                    display="compact"
                    onChange={(_e, d) => { if (d) setStartDate(d); }}
                    style={{ marginLeft: -6 }}
                  />
                </View>
              ) : (
                <TouchableOpacity style={s.dateInput} onPress={() => setShowStart(true)} activeOpacity={0.8}>
                  <Text style={startDate ? s.dateInputText : s.dateInputPlaceholder}>
                    {startDate ? formatDateDisplay(startDate) : 'mm/dd/yyyy'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.dateLabel}>End Date <Text style={s.optional}>(Optional)</Text></Text>
              {Platform.OS === 'ios' ? (
                <View style={s.dateInput}>
                  <DateTimePicker
                    value={endDate ?? new Date()}
                    mode="date"
                    display="compact"
                    onChange={(_e, d) => { if (d) setEndDate(d); }}
                    style={{ marginLeft: -6 }}
                  />
                </View>
              ) : (
                <TouchableOpacity style={s.dateInput} onPress={() => setShowEnd(true)} activeOpacity={0.8}>
                  <Text style={endDate ? s.dateInputText : s.dateInputPlaceholder}>
                    {endDate ? formatDateDisplay(endDate) : 'mm/dd/yyyy'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Reminder */}
          <Text style={s.dateLabel}>Reminder (minutes before)?</Text>
          <View style={s.reminderRow}>
            <Spinner value={reminder} onChange={setReminder} min={0} max={120} />
          </View>

          {/* Frequency */}
          <Text style={s.dateLabel}>Frequency</Text>
          <View style={s.freqRow}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[s.freqBtn, frequency === f.value && s.freqBtnActive]}
                onPress={() => setFrequency(f.value)}
                activeOpacity={0.7}
              >
                <Text style={[s.freqBtnText, frequency === f.value && s.freqBtnTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Priority */}
          <Text style={s.dateLabel}>Priority</Text>
          <View style={s.priorityRow}>
            {(['LOW', 'NORMAL', 'HIGH'] as Priority[]).map((p) => (
              <TouchableOpacity key={p} style={s.radioRow} onPress={() => setPriority(p)} activeOpacity={0.7}>
                <View style={[s.radio, priority === p && s.radioActive]}>
                  {priority === p && <View style={s.radioDot} />}
                </View>
                <Text style={s.radioLabel}>{p.charAt(0) + p.slice(1).toLowerCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Add dosage time */}
        <TouchableOpacity style={s.addDoseBtn} onPress={addDose} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#E53935" />
          <Text style={s.addDoseBtnText}>Add Dosage Time</Text>
        </TouchableOpacity>
        <Text style={s.addDoseNote}>Add multiple dosage if taken different times.</Text>

        {/* Instructions */}
        <Text style={s.sectionLabelBold}>Instructions</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={instructions} onChangeText={setInstructions}
          placeholder="Take with food. Avoid caffeine..." placeholderTextColor="#C4C4C4"
          multiline numberOfLines={4} textAlignVertical="top"
        />

        <Text style={s.footerNote}>Parensure provides reminders only.</Text>

        <TouchableOpacity
          style={[s.continueBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.continueBtnText}>Save Medication</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Android-only date pickers (iOS uses inline compact picker above) */}
      {showStart && Platform.OS === 'android' && (
        <DateTimePicker
          value={startDate ?? new Date()}
          mode="date"
          display="calendar"
          onChange={(_e, d) => { setShowStart(false); if (d) setStartDate(d); }}
        />
      )}
      {showEnd && Platform.OS === 'android' && (
        <DateTimePicker
          value={endDate ?? new Date()}
          mode="date"
          display="calendar"
          onChange={(_e, d) => { setShowEnd(false); if (d) setEndDate(d); }}
        />
      )}
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F5F5F7',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', flex: 1 },

  progressTrack: { height: 3, backgroundColor: '#E5E7EB' },
  progressFill: { height: '100%', backgroundColor: '#E53935' },

  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  title: { fontSize: 26, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5, marginBottom: 8, marginTop: 16 },
  subtitle: { fontSize: 13, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 19, marginBottom: 24 },

  sectionLabel: {
    fontSize: 11, fontFamily: F.i.semiBold, color: '#9CA3AF',
    letterSpacing: 0.4, marginBottom: 14, marginTop: 8,
  },
  sectionLabelBold: {
    fontSize: 17, fontFamily: F.m.bold, color: '#111', marginBottom: 14, marginTop: 8,
  },
  subSectionLabel: { fontSize: 16, fontFamily: F.m.bold, color: '#111', marginBottom: 14 },

  label: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111', marginBottom: 8 },
  optional: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF' },
  input: {
    backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, fontFamily: F.i.regular, color: '#111',
    marginBottom: 16,
  },
  textArea: { minHeight: 100, paddingTop: 14, textAlignVertical: 'top' },

  // Intake method cards
  intakeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  intakeCard: {
    flex: 1, padding: 16, borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5, borderColor: 'transparent',
    gap: 6, position: 'relative',
  },
  intakeCardActive: { borderColor: '#E53935', backgroundColor: '#FFF' },
  intakeCheck: { position: 'absolute', top: 10, right: 10 },
  intakeCardTitle: { fontSize: 15, fontFamily: F.m.bold, color: '#374151', marginTop: 4 },
  intakeCardTitleActive: { color: '#E53935' },
  intakeCardDesc: { fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF', lineHeight: 15 },

  card: { backgroundColor: '#F3F4F6', borderRadius: 16, padding: 16, marginBottom: 12, gap: 14 },

  doseRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  doseColWrap: { alignItems: 'center', gap: 4 },
  doseColLabel: { fontSize: 11, fontFamily: F.m.medium, color: '#9CA3AF' },
  removeBtn: { padding: 4, marginBottom: 4 },

  dateRow: { flexDirection: 'row', gap: 12 },
  dateLabel: { fontSize: 13, fontFamily: F.m.medium, color: '#374151', marginBottom: 8 },
  dateInput: {
    backgroundColor: '#E9EAEC', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    justifyContent: 'center',
  },
  dateInputText:        { fontSize: 13, fontFamily: F.i.regular, color: '#111' },
  dateInputPlaceholder: { fontSize: 13, fontFamily: F.i.regular, color: '#C4C4C4' },

  reminderRow: { flexDirection: 'row' },

  freqRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  freqBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#E9EAEC' },
  freqBtnActive: { backgroundColor: '#E53935' },
  freqBtnText: { fontSize: 13, fontFamily: F.m.medium, color: '#555' },
  freqBtnTextActive: { color: '#FFF' },

  priorityRow: { flexDirection: 'row', gap: 20 },
  radioRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#E53935' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935' },
  radioLabel: { fontSize: 13, fontFamily: F.m.medium, color: '#374151' },

  divider: { height: 1, backgroundColor: '#E5E7EB' },

  addDoseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#E53935', borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 13, marginBottom: 6,
  },
  addDoseBtnText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },
  addDoseNote: { fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 },

  footerNote: {
    fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF',
    textAlign: 'center', marginBottom: 16, marginTop: 4,
  },
  continueBtn: {
    height: 56, borderRadius: 28,
    backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  continueBtnText: { fontSize: 16, fontFamily: F.m.bold, color: '#FFF' },
  noReceiversText: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280', padding: 24, textAlign: 'center' },
});

const dd = StyleSheet.create({
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#E9EAEC', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 16,
  },
  periodBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#E9EAEC', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    gap: 6, minWidth: 80,
  },
  value:       { fontSize: 14, fontFamily: F.i.regular, color: '#111' },
  placeholder: { color: '#9CA3AF' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: 400, paddingBottom: 32, paddingTop: 8,
  },
  sheetTitle: { fontSize: 16, fontFamily: F.m.bold, color: '#111', paddingHorizontal: 24, paddingVertical: 16 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 14,
  },
  optionActive:     { backgroundColor: '#FEF2F2' },
  optionText:       { fontSize: 15, fontFamily: F.i.regular, color: '#111' },
  optionTextActive: { color: '#E53935', fontFamily: F.m.semiBold },
});

const sp = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2, minWidth: 44 },
  val:  { fontSize: 20, fontFamily: F.m.bold, color: '#111', minWidth: 32, textAlign: 'center' },
});
