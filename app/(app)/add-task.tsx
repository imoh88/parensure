import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { caregiverApi } from '@/lib/api/caregiver';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { taskCache } from '@/lib/utils/taskCache';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Add, ArrowDown2, ArrowLeft, CloseCircle, DocumentText, RowHorizontal, TickCircle } from 'iconsax-react-native';
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
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: 'Exercise', value: 'EXERCISE' },
  { label: 'Medication', value: 'MEDICATION' },
  { label: 'Health', value: 'HEALTH' },
  { label: 'Check-in', value: 'CHECK_IN' },
  { label: 'Other', value: 'OTHER' },
] as const;

type Category = (typeof CATEGORIES)[number]['value'];
type Frequency = 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'CUSTOM';
type Priority = 'LOW' | 'NORMAL' | 'HIGH';

interface Receiver {
  id: string;
  careReceiverId: string;
  name: string;
}

interface ScheduledTime {
  date: Date;
}

function formatDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatTimeLabel(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
}

function parseTimeLabel(label: string): Date {
  const d = new Date();
  const upper = label.trim().toUpperCase();
  const [timePart = '', period = 'AM'] = upper.split(' ');
  const [hStr = '0', mStr = '0'] = timePart.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  d.setHours(h, m, 0, 0);
  return d;
}

// ─── Days ─────────────────────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
type Day = (typeof DAYS)[number];
interface DaySchedule { start: Date | null; end: Date | null; }
type CustomSchedule = Record<Day, DaySchedule>;
const emptySchedule = (): CustomSchedule =>
  Object.fromEntries(DAYS.map((d) => [d, { start: null, end: null }])) as CustomSchedule;

// ─── DateTimePicker bottom-sheet modal ───────────────────────────────────────
function PickerSheetModal({
  visible,
  mode,
  value,
  minimumDate,
  onConfirm,
  onCancel,
  title,
}: {
  visible: boolean;
  mode: 'date' | 'time';
  value: Date;
  minimumDate?: Date;
  onConfirm: (d: Date) => void;
  onCancel: () => void;
  title?: string;
}) {
  const [draft, setDraft] = useState(value);

  // Sync draft when value changes or modal opens
  useEffect(() => { if (visible) setDraft(value); }, [visible, value]);

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={draft}
        mode={mode}
        display="default"
        minimumDate={minimumDate}
        onChange={(_e, d) => {
          if (d) onConfirm(d);
          else onCancel();
        }}
      />
    );
  }

  // iOS: spinner in a bottom sheet
  // Backdrop and sheet are SIBLINGS inside a flex column so the backdrop
  // only covers the area above the sheet — picker touches are never blocked.
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={ps.root}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={ps.backdrop} />
        </TouchableWithoutFeedback>

        <View style={ps.sheet}>
          <View style={ps.handle} />
          <View style={ps.header}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7} hitSlop={12}>
              <Text style={ps.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={ps.title}>{title ?? (mode === 'time' ? 'Select Time' : 'Select Date')}</Text>
            <TouchableOpacity onPress={() => onConfirm(draft)} activeOpacity={0.7} hitSlop={12}>
              <Text style={ps.done}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={draft}
            mode={mode}
            display="spinner"
            minimumDate={minimumDate}
            textColor="#000000"
            themeVariant="light"
            style={ps.picker}
            onChange={(_e, d) => { if (d) setDraft(d); }}
          />
        </View>
      </View>
    </Modal>
  );
}

const ps = StyleSheet.create({
  root: {
    flex: 1, justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },
  cancel: { fontSize: 15, fontFamily: F.m.medium, color: '#6B7280' },
  done: { fontSize: 15, fontFamily: F.m.semiBold, color: '#E53935' },
  picker: { width: '100%', height: 200 },
});

// ─── Picker Modal (category / receiver / etc.) ───────────────────────────────
function PickerModal<T extends string>({
  visible,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pm.backdrop} onPress={onClose}>
        <View style={pm.sheet}>
          {options.map((o) => (
            <TouchableOpacity
              key={o.value}
              style={[pm.option, selected === o.value && pm.optionActive]}
              onPress={() => { onSelect(o.value); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[pm.optionText, selected === o.value && pm.optionTextActive]}>
                {o.label}
              </Text>
              {selected === o.value && <TickCircle size={18} color="#E53935" variant="Linear" />}
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const pm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingVertical: 12, paddingBottom: 32,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  optionActive: { backgroundColor: '#FEF2F2' },
  optionText: { fontSize: 16, fontFamily: F.i.regular, color: '#111' },
  optionTextActive: { color: '#E53935', fontFamily: F.m.semiBold },
});

// ─── Custom Schedule Modal ─────────────────────────────────────────────────────
function CustomScheduleModal({
  visible,
  schedule,
  onChange,
  onClose,
}: {
  visible: boolean;
  schedule: CustomSchedule;
  onChange: (s: CustomSchedule) => void;
  onClose: () => void;
}) {
  const [pickerFor, setPickerFor] = useState<{ day: Day; field: 'start' | 'end' } | null>(null);
  const currentVal = pickerFor
    ? (schedule[pickerFor.day][pickerFor.field] ?? new Date())
    : new Date();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={cs.root}>
        <View style={cs.header}>
          <Text style={cs.title}>Custom Schedule</Text>
          <TouchableOpacity style={cs.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={cs.closeX}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={cs.scroll}>
          {DAYS.map((day) => (
            <View key={day} style={cs.dayBlock}>
              <Text style={cs.dayLabel}>{day}</Text>
              <View style={cs.timeRow}>
                <TouchableOpacity
                  style={cs.timePill}
                  onPress={() => setPickerFor({ day, field: 'start' })}
                  activeOpacity={0.8}
                >
                  <Text style={[cs.timePillText, !schedule[day].start && cs.timePlaceholder]}>
                    {schedule[day].start ? formatTimeLabel(schedule[day].start!) : 'Start time'}
                  </Text>
                </TouchableOpacity>
                <Text style={cs.dash}>–</Text>
                <TouchableOpacity
                  style={cs.timePill}
                  onPress={() => setPickerFor({ day, field: 'end' })}
                  activeOpacity={0.8}
                >
                  <Text style={[cs.timePillText, !schedule[day].end && cs.timePlaceholder]}>
                    {schedule[day].end ? formatTimeLabel(schedule[day].end!) : 'End time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      <PickerSheetModal
        visible={!!pickerFor}
        mode="time"
        value={currentVal}
        onConfirm={(d) => {
          if (!pickerFor) return;
          onChange({ ...schedule, [pickerFor.day]: { ...schedule[pickerFor.day], [pickerFor.field]: d } });
          setPickerFor(null);
        }}
        onCancel={() => setPickerFor(null)}
      />
    </Modal>
  );
}

const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 20, fontFamily: F.m.bold, color: '#111', flex: 1, textAlign: 'center' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  closeX: { fontSize: 14, color: '#6B7280', fontFamily: F.m.semiBold },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  dayBlock: { marginBottom: 24 },
  dayLabel: { fontSize: 16, fontFamily: F.m.semiBold, color: '#111', marginBottom: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dash: { fontSize: 18, color: '#9CA3AF', fontFamily: F.m.semiBold },
  timePill: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    alignItems: 'center',
  },
  timePillText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#111' },
  timePlaceholder: { color: '#9CA3AF', fontFamily: F.i.regular },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId?: string; from?: string }>();
  const editTask = params.taskId ? (taskCache.get() as any) : null;
  const isEditMode = !!params.taskId;
  const { activeRole } = useAuthStore();
  const isCareReceiver = activeRole === 'CARE_RECEIVER';

  const [title, setTitle] = useState(editTask?.title ?? '');
  const [description, setDescription] = useState(editTask?.description ?? '');
  const [category, setCategory] = useState<Category>((editTask?.category as Category) ?? 'EXERCISE');
  const [frequency, setFrequency] = useState<Frequency>((editTask?.frequency as Frequency) ?? 'ONE_TIME');
  const [priority, setPriority] = useState<Priority>((editTask?.priority as Priority) ?? 'NORMAL');

  // Time as a Date object
  const defaultTime = new Date();
  defaultTime.setHours(8, 0, 0, 0);
  const [currentTime, setCurrentTime] = useState<Date>(defaultTime);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [scheduledTimes, setScheduledTimes] = useState<ScheduledTime[]>(() =>
    (editTask?.scheduledTimes as string[] | undefined ?? []).map((t) => ({ date: parseTimeLabel(t) }))
  );
  const [subtasks, setSubtasks] = useState<string[]>(editTask?.subtasks ?? []);
  const [subtaskInput, setSubtaskInput] = useState('');

  const [startDate, setStartDate] = useState<Date | null>(editTask?.startDate ? new Date(editTask.startDate) : null);
  const [endDate, setEndDate] = useState<Date | null>(editTask?.endDate ? new Date(editTask.endDate) : null);
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);

  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [selectedReceiverId, setSelectedReceiverId] = useState('');
  const [loadingReceivers, setLoadingReceivers] = useState(true);

  const [customSchedule, setCustomSchedule] = useState<CustomSchedule>(emptySchedule);
  const [showCustomSchedule, setShowCustomSchedule] = useState(false);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showReceiverPicker, setShowReceiverPicker] = useState(false);

  const [saving, setSaving] = useState(false);

  interface AttachmentFile {
    id: string;
    name: string;
    uri: string;
    mimeType: string;
    size?: number;
    key?: string;
    uploading: boolean;
    error?: string;
  }
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  const pickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const fileId = `${Date.now()}-${Math.random()}`;
      const file: AttachmentFile = {
        id: fileId,
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size: asset.size,
        uploading: true,
      };

      setAttachments((prev) => [...prev, file]);

      try {
        const urlRes = await caregiverApi.getTaskUploadUrl(asset.name, file.mimeType);
        if (!urlRes.success || !urlRes.data) throw new Error('Failed to get upload URL');

        const { url, key } = urlRes.data;
        const uploadRes = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': file.mimeType },
          body: await fetch(asset.uri).then((r) => r.blob()),
        });

        if (!uploadRes.ok) throw new Error('Upload failed');

        setAttachments((prev) =>
          prev.map((a) => (a.id === fileId ? { ...a, key, uploading: false } : a))
        );
      } catch {
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === fileId ? { ...a, uploading: false, error: 'Upload failed' } : a
          )
        );
      }
    } catch {
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const loadReceivers = useCallback(async () => {
    if (isCareReceiver) { setLoadingReceivers(false); return; }
    setLoadingReceivers(true);
    try {
      const res = await caregiverApi.getBookings();
      if (res.success && res.data) {
        const list: Receiver[] = (res.data as any[])
          .filter((b) => b.careReceiver?.user)
          .map((b) => ({
            id: b.id,
            careReceiverId: b.careReceiverId,
            name: b.careReceiver?.user?.fullName ?? 'Unknown',
          }));
        setReceivers(list);
        if (list.length > 0 && list[0]) {
          setSelectedReceiverId(list[0].careReceiverId);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoadingReceivers(false);
    }
  }, [isCareReceiver]);

  useEffect(() => { loadReceivers(); }, [loadReceivers]);

  // Minimum selectable time — now() when start date is today or in the past (includes edit mode)
  const timePickerMinimum = (() => {
    const now = new Date();
    const todayMidnight = new Date(now); todayMidnight.setHours(0, 0, 0, 0);
    const effectiveStartDay = startDate ? new Date(startDate) : todayMidnight;
    effectiveStartDay.setHours(0, 0, 0, 0);
    return effectiveStartDay <= todayMidnight ? now : undefined;
  })();

  const addTime = () => {
    const label = formatTimeLabel(currentTime);

    if (timePickerMinimum) {
      const picked = new Date();
      picked.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
      if (picked <= timePickerMinimum) {
        Alert.alert('Invalid Time', 'This time has already passed. Please choose a future time.');
        return;
      }
    }

    if (!scheduledTimes.find((t) => formatTimeLabel(t.date) === label)) {
      setScheduledTimes((prev) => [...prev, { date: new Date(currentTime) }]);
    }
  };

  const removeTime = (i: number) =>
    setScheduledTimes((prev) => prev.filter((_, idx) => idx !== i));

  const isTimePast = (t: ScheduledTime): boolean => {
    const now = new Date();
    const todayMidnight = new Date(now); todayMidnight.setHours(0, 0, 0, 0);
    const effectiveStartDay = startDate ? new Date(startDate) : todayMidnight;
    effectiveStartDay.setHours(0, 0, 0, 0);
    if (effectiveStartDay > todayMidnight) return false; // future start date — nothing is past yet
    const picked = new Date(); picked.setHours(t.date.getHours(), t.date.getMinutes(), 0, 0);
    return picked <= now;
  };

  const addSubtask = () => {
    const trimmed = subtaskInput.trim();
    if (trimmed) {
      setSubtasks((prev) => [...prev, trimmed]);
      setSubtaskInput('');
    }
  };

  const removeSubtask = (i: number) =>
    setSubtasks((prev) => prev.filter((_, idx) => idx !== i));

  const selectedReceiver = receivers.find((r) => r.careReceiverId === selectedReceiverId);
  const receiverOptions = receivers.map((r) => ({ label: r.name, value: r.careReceiverId }));
  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label ?? 'Other';

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a task title.'); return; }
    if (!isCareReceiver && !selectedReceiverId) { Alert.alert('Required', 'Please assign the task to a care receiver.'); return; }

    setSaving(true);
    try {
      const timeLabels = scheduledTimes.map((t) => formatTimeLabel(t.date));
      const uploadedKeys = attachments
        .filter((a) => a.key && !a.error)
        .map((a) => a.key as string);

      const taskPayload = {
        careReceiverId: selectedReceiverId,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        scheduledTimes: timeLabels,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        frequency,
        priority,
        subtasks,
        attachments: uploadedKeys,
      };

      const res = isEditMode
        ? await caregiverApi.updateTask(params.taskId!, taskPayload)
        : await caregiverApi.createTask(taskPayload);

      if (res.success) {
        router.replace('/(app)');
      } else {
        Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} task. Please try again.`);
      }
    } catch {
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} task. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper bg="#FFFFFF">
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEditMode ? 'Edit Task' : 'Add Task'}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.titleBlock}>
          <Text style={s.pageTitle}>Add New Task</Text>
          <Text style={s.pageSub}>Create a supportive plan for your loved one.</Text>
        </View>

        {/* Task Title */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Task Title</Text>
          <TextInput
            style={s.input}
            placeholder="e.g Take a walk"
            placeholderTextColor="#C4C4C4"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Description</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Add specific instructions or notes..."
            placeholderTextColor="#C4C4C4"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Category */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Category</Text>
          <TouchableOpacity style={s.selector} onPress={() => setShowCategoryPicker(true)} activeOpacity={0.8}>
            <Text style={s.selectorText}>{categoryLabel}</Text>
            <ArrowDown2 size={18} color="#9CA3AF" variant="Linear" />
          </TouchableOpacity>
        </View>

        {/* Assign To */}
        {!isCareReceiver && (
          <View style={s.field}>
            <Text style={s.fieldLabel}>Assign To</Text>
            {loadingReceivers ? (
              <ActivityIndicator color="#E53935" style={{ marginTop: 8 }} />
            ) : receivers.length === 0 ? (
              <Text style={s.emptyText}>No care receivers in your care circle yet.</Text>
            ) : (
              <TouchableOpacity style={s.selector} onPress={() => setShowReceiverPicker(true)} activeOpacity={0.8}>
                <Text style={s.selectorText}>{selectedReceiver?.name ?? 'Select...'}</Text>
                <ArrowDown2 size={18} color="#9CA3AF" variant="Linear" />
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={s.sectionDividerLabel}>Dose Schedule</Text>

        {/* ── Time & Duration Card ── */}
        <View style={s.timeSectionCard}>
          <Text style={s.sectionTitle}>Time & Duration</Text>

          {/* Time picker row */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Scheduled Time</Text>
            <TouchableOpacity
              style={s.timeTrigger}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.8}
            >
              <View style={s.timeTriggerLeft}>
                <Text style={s.timeTriggerValue}>{formatTimeLabel(currentTime)}</Text>
                <Text style={s.timeTriggerHint}>Tap to change</Text>
              </View>
              <View style={s.timeTriggerBadge}>
                <Text style={s.timeTriggerBadgeText}>🕐</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Add time button */}
          <TouchableOpacity style={s.addTimeBtn} onPress={addTime} activeOpacity={0.8}>
            <Add size={18} color="#E53935" variant="Linear" />
            <Text style={s.addTimeBtnText}>Add This Time</Text>
          </TouchableOpacity>
          <Text style={s.addTimeHint}>Add multiple times if taken at different hours.</Text>

          {/* Added time chips */}
          {scheduledTimes.length > 0 && (
            <View style={s.timeChipsRow}>
              {scheduledTimes.map((t, i) => {
                const past = isTimePast(t);
                return (
                  <View key={i} style={[s.timeChip, past && s.timeChipPast]}>
                    <Text style={[s.timeChipText, past && s.timeChipTextPast]}>{formatTimeLabel(t.date)}</Text>
                    {past ? (
                      <Text style={s.timeChipPassedLabel}>passed</Text>
                    ) : (
                      <TouchableOpacity onPress={() => removeTime(i)} hitSlop={8}>
                        <CloseCircle size={14} color="#E53935" variant="Linear" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Start / End Dates */}
          <View style={s.datesRow}>
            <View style={s.dateField}>
              <Text style={s.fieldLabel}>Start Date</Text>
              <TouchableOpacity
                style={[s.dateInput, startDate && s.dateInputFilled]}
                onPress={() => setShowStartDate(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.dateText, !startDate && s.datePlaceholder]}>
                  {startDate ? formatDate(startDate) : 'mm/dd/yyyy'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={s.dateField}>
              <Text style={s.fieldLabel}>End Date</Text>
              <TouchableOpacity
                style={[s.dateInput, endDate && s.dateInputFilled]}
                onPress={() => setShowEndDate(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.dateText, !endDate && s.datePlaceholder]}>
                  {endDate ? formatDate(endDate) : 'Optional'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Frequency */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Frequency</Text>
            <View style={s.freqRow}>
              {(['ONE_TIME', 'DAILY', 'WEEKLY', 'CUSTOM'] as Frequency[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[s.freqBtn, frequency === f && s.freqBtnActive]}
                  onPress={() => {
                    setFrequency(f);
                    if (f === 'CUSTOM') setShowCustomSchedule(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.freqBtnText, frequency === f && s.freqBtnTextActive]}>
                    {f === 'ONE_TIME' ? 'One-time' : f === 'DAILY' ? 'Daily' : f === 'WEEKLY' ? 'Weekly' : 'Custom'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom schedule summary */}
            {frequency === 'CUSTOM' && DAYS.some((d) => customSchedule[d].start) && (
              <View style={s.customSummary}>
                {DAYS.filter((d) => customSchedule[d].start).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={s.customSummaryRow}
                    onPress={() => setShowCustomSchedule(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.customSummaryDay}>{d.slice(0, 3)}</Text>
                    <Text style={s.customSummaryTime}>
                      {formatTimeLabel(customSchedule[d].start!)}
                      {customSchedule[d].end ? ` – ${formatTimeLabel(customSchedule[d].end!)}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setShowCustomSchedule(true)} activeOpacity={0.7}>
                  <Text style={s.customSummaryEdit}>Edit schedule</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Priority */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Priority</Text>
            <View style={s.priorityRow}>
              {(['LOW', 'NORMAL', 'HIGH'] as Priority[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={s.radioItem}
                  onPress={() => setPriority(p)}
                  activeOpacity={0.7}
                >
                  <View style={[s.radio, priority === p && s.radioActive]}>
                    {priority === p && <View style={s.radioDot} />}
                  </View>
                  <Text style={s.radioLabel}>{p[0] + p.slice(1).toLowerCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Subtasks */}
        <View style={s.subtaskHeader}>
          <Text style={s.sectionTitle}>Sub-tasks</Text>
        </View>

        {subtasks.map((item, i) => (
          <View key={i} style={s.subtaskRow}>
            <RowHorizontal size={20} color="#D1D5DB" variant="Linear" style={{ marginRight: 8 }} />
            <Text style={s.subtaskText} numberOfLines={1}>{item}</Text>
            <TouchableOpacity onPress={() => removeSubtask(i)} hitSlop={8}>
              <CloseCircle size={18} color="#9CA3AF" variant="Linear" />
            </TouchableOpacity>
          </View>
        ))}

        <TextInput
          style={s.subtaskInput}
          placeholder="+ Add subtask..."
          placeholderTextColor="#C4C4C4"
          value={subtaskInput}
          onChangeText={setSubtaskInput}
          onSubmitEditing={addSubtask}
          returnKeyType="done"
        />

        <View style={s.divider} />

        {/* Attachment */}
        <TouchableOpacity style={s.attachBox} onPress={pickAndUpload} activeOpacity={0.8}>
          <DocumentText size={32} color="#D1D5DB" variant="Linear" />
          <Text style={s.attachTitle}>Add an attachment</Text>
          <Text style={s.attachSub}>Add photos, medical reports, or documents (Max 10MB)</Text>
          <View style={s.chooseFileBtn}>
            <Text style={s.chooseFileText}>Choose File</Text>
          </View>
        </TouchableOpacity>

        {attachments.length > 0 && (
          <View style={s.attachList}>
            {attachments.map((a, i) => (
              <View key={i} style={[s.attachItem, a.error && s.attachItemError]}>
                <DocumentText size={18} color={a.error ? '#EF4444' : '#6B7280'} variant="Linear" />
                <Text style={s.attachItemName} numberOfLines={1}>{a.name}</Text>
                {a.uploading ? (
                  <ActivityIndicator size="small" color="#E53935" />
                ) : a.error ? (
                  <Text style={s.attachItemErr}>Failed</Text>
                ) : (
                  <Text style={s.attachItemDone}>✓</Text>
                )}
                <TouchableOpacity onPress={() => removeAttachment(a.id)} hitSlop={8}>
                  <CloseCircle size={16} color="#9CA3AF" variant="Linear" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.saveBtnText}>Save Task</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      <PickerSheetModal
        visible={showTimePicker}
        mode="time"
        value={currentTime}
        minimumDate={timePickerMinimum}
        title="Select Time"
        onConfirm={(d) => { setCurrentTime(d); setShowTimePicker(false); }}
        onCancel={() => setShowTimePicker(false)}
      />

      <PickerSheetModal
        visible={showStartDate}
        mode="date"
        value={startDate ?? new Date()}
        minimumDate={(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })()}
        title="Start Date"
        onConfirm={(d) => { setStartDate(d); setShowStartDate(false); }}
        onCancel={() => setShowStartDate(false)}
      />

      <PickerSheetModal
        visible={showEndDate}
        mode="date"
        value={endDate ?? new Date()}
        minimumDate={startDate ?? undefined}
        title="End Date"
        onConfirm={(d) => { setEndDate(d); setShowEndDate(false); }}
        onCancel={() => setShowEndDate(false)}
      />

      <PickerModal
        visible={showCategoryPicker}
        options={CATEGORIES as unknown as { label: string; value: string }[]}
        selected={category}
        onSelect={(v) => setCategory(v as Category)}
        onClose={() => setShowCategoryPicker(false)}
      />
      <PickerModal
        visible={showReceiverPicker}
        options={receiverOptions}
        selected={selectedReceiverId}
        onSelect={(v) => setSelectedReceiverId(v)}
        onClose={() => setShowReceiverPicker(false)}
      />

      <CustomScheduleModal
        visible={showCustomSchedule}
        schedule={customSchedule}
        onChange={setCustomSchedule}
        onClose={() => setShowCustomSchedule(false)}
      />
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 60 },

  titleBlock: { marginTop: 20, marginBottom: 24, gap: 6 },
  pageTitle: { fontSize: 26, fontFamily: F.m.xBold, color: '#111', letterSpacing: -0.5 },
  pageSub: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280', lineHeight: 21 },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontFamily: F.m.semiBold, color: '#374151', marginBottom: 8 },

  input: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: F.i.regular, color: '#111',
  },
  textarea: { minHeight: 100, paddingTop: 14 },

  selector: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectorText: { fontSize: 15, fontFamily: F.i.regular, color: '#111' },
  emptyText: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF', marginTop: 8 },

  sectionDividerLabel: {
    fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF', marginBottom: 8,
  },

  // ── Time section card ──
  timeSectionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 24,
    gap: 4,
  },
  sectionTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.3, marginBottom: 16 },

  // Time trigger button
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

  addTimeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderColor: '#E53935',
    borderStyle: 'dashed', borderRadius: 10,
    paddingVertical: 12, marginTop: 4,
  },
  addTimeBtnText: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },
  addTimeHint: {
    fontSize: 11, fontFamily: F.i.regular, color: '#9CA3AF',
    textAlign: 'center', marginTop: 6,
  },
  timeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 50,
    borderWidth: 1, borderColor: '#FCA5A5',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  timeChipText: { fontSize: 12, fontFamily: F.m.semiBold, color: '#E53935' },
  timeChipPast: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  timeChipTextPast: { color: '#9CA3AF' },
  timeChipPassedLabel: { fontSize: 10, fontFamily: F.m.semiBold, color: '#9CA3AF', letterSpacing: 0.3 },

  datesRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  dateField: { flex: 1 },
  dateInput: {
    backgroundColor: '#FFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 14,
    alignItems: 'center',
  },
  dateInputFilled: { borderColor: '#E53935', backgroundColor: '#FEF2F2' },
  dateText: { fontSize: 13, fontFamily: F.m.semiBold, color: '#111' },
  datePlaceholder: { color: '#C4C4C4', fontFamily: F.i.regular },

  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqBtn: {
    paddingVertical: 9, paddingHorizontal: 20, borderRadius: 50,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  freqBtnActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  freqBtnText: { fontSize: 12, fontFamily: F.m.semiBold, color: '#6B7280' },
  freqBtnTextActive: { color: '#FFF' },
  customSummary: {
    marginTop: 12, backgroundColor: '#FFF9F9',
    borderRadius: 10, padding: 12, gap: 8,
    borderWidth: 1, borderColor: '#FCE4E4',
  },
  customSummaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  customSummaryDay: { fontSize: 13, fontFamily: F.m.semiBold, color: '#111', width: 36 },
  customSummaryTime: { fontSize: 13, fontFamily: F.i.regular, color: '#374151', flex: 1 },
  customSummaryEdit: { fontSize: 12, fontFamily: F.m.semiBold, color: '#E53935', marginTop: 4 },

  priorityRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  radioItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#E53935' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E53935' },
  radioLabel: { fontSize: 14, fontFamily: F.i.regular, color: '#374151' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 20 },

  subtaskHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },

  subtaskRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  subtaskText: { flex: 1, fontSize: 14, fontFamily: F.i.regular, color: '#111' },
  subtaskInput: {
    fontSize: 14, fontFamily: F.i.regular, color: '#111',
    paddingVertical: 12, paddingHorizontal: 4,
  },

  attachBox: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed',
    borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 8, marginBottom: 28,
  },
  attachTitle: { fontSize: 15, fontFamily: F.m.bold, color: '#111' },
  attachSub: {
    fontSize: 12, fontFamily: F.i.regular, color: '#9CA3AF',
    textAlign: 'center', lineHeight: 18,
  },
  chooseFileBtn: {
    marginTop: 4, paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB',
  },
  chooseFileText: { fontSize: 13, fontFamily: F.m.semiBold, color: '#374151' },

  saveBtn: {
    backgroundColor: '#E53935', borderRadius: 50,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  saveBtnText: { color: '#FFF', fontFamily: F.m.bold, fontSize: 16 },

  cancelBtn: {
    borderRadius: 50, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#E53935',
  },
  cancelBtnText: { color: '#E53935', fontFamily: F.m.semiBold, fontSize: 15 },

  attachList: { gap: 8, marginBottom: 20 },
  attachItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9FAFB', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  attachItemError: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  attachItemName: { flex: 1, fontSize: 13, fontFamily: F.i.regular, color: '#111' },
  attachItemErr: { fontSize: 12, fontFamily: F.m.semiBold, color: '#EF4444' },
  attachItemDone: { fontSize: 14, color: '#10B981', fontFamily: F.m.bold },
});
