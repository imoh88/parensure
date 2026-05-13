import ScreenWrapper from '@/components/ui/ScreenWrapper';
import { caregiverApi } from '@/lib/api/caregiver';
import { careReceiverApi } from '@/lib/api/careReceiver';
import { F } from '@/lib/fonts';
import { useAuthStore } from '@/lib/store/authStore';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, SearchNormal1, UserAdd } from 'iconsax-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface SearchResult {
  id: string;
  fullName: string;
  email?: string;
  alreadyAdded?: boolean;
  caregiverProfileId?: string;
}

export default function AddCareReceiverScreen() {
  const router = useRouter();
  const { from, careReceiverId, receiverName } = useLocalSearchParams<{
    from?: string;
    careReceiverId?: string;
    receiverName?: string;
  }>();
  const { activeRole } = useAuthStore();
  const isCareReceiver = activeRole === 'CARE_RECEIVER';
  // When launched from manage-carecircle with a careReceiverId, the primary
  // caregiver is adding another caregiver to an existing care receiver's team.
  const isAddingCaregiverToTeam = !isCareReceiver && from === '/(app)/manage-carecircle' && !!careReceiverId;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goBack = useCallback(() => {
    if (from) router.push({ pathname: from as any, params: { careReceiverId, receiverName } });
    else router.push('/(app)/carecircle');
  }, [router, from, careReceiverId, receiverName]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack])
  );

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setSearched(false);
        return;
      }
      setSearching(true);
      setSearched(true);
      try {
        if (isCareReceiver) {
          const res = await careReceiverApi.searchCaregivers(q.trim());
          if (res.success && res.data) {
            const caregivers: any[] = (res.data as any).caregivers ?? (res.data as any[]);
            setResults(
              caregivers.map((cg: any) => ({
                id: cg.id,
                fullName: cg.user?.fullName ?? 'Unknown',
                email: cg.user?.email,
              }))
            );
          } else {
            setResults([]);
          }
        } else if (isAddingCaregiverToTeam) {
          const res = await caregiverApi.searchTeamCaregivers(careReceiverId!, q.trim());
          if (res.success && res.data) {
            setResults(
              (res.data as any[]).map((cg: any) => ({
                id: cg.id,
                fullName: cg.fullName,
                email: cg.email,
                alreadyAdded: cg.alreadyAdded,
                caregiverProfileId: cg.caregiverProfileId,
              }))
            );
          } else {
            setResults([]);
          }
        } else {
          const res = await caregiverApi.searchCareReceivers(q.trim());
          if (res.success && res.data) {
            setResults(
              (res.data as any[]).map((cr: any) => ({
                id: cr.careReceiverId,
                fullName: cr.fullName,
                email: cr.email,
                alreadyAdded: cr.alreadyAdded,
              }))
            );
          } else {
            setResults([]);
          }
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [isCareReceiver, isAddingCaregiverToTeam, careReceiverId]
  );

  const onChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), 500);
  };

  const handleAdd = async (item: SearchResult) => {
    if (item.alreadyAdded) return;
    setActioning(item.id);
    try {
      if (isCareReceiver) {
        await careReceiverApi.addCaregiver(item.id);
        Alert.alert('Added', `${item.fullName} has been added to your care circle.`, [
          { text: 'OK', onPress: goBack },
        ]);
      } else if (isAddingCaregiverToTeam) {
        await caregiverApi.addCaregiverToTeam(careReceiverId!, item.caregiverProfileId!);
        Alert.alert('Added', `${item.fullName} has been added to the care team.`, [
          { text: 'OK', onPress: goBack },
        ]);
      } else {
        await caregiverApi.addCareReceiver(item.id);
        Alert.alert('Added', `${item.fullName} has been added to your care circle.`, [
          { text: 'OK', onPress: goBack },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Something went wrong.');
    } finally {
      setActioning(null);
    }
  };

  const handleSendInvite = () => {
    router.push({
      pathname: '/(app)/invite-member',
      params: {
        prefillEmail: query.trim(),
        from: '/(app)/add-care-receiver',
      },
    });
  };

  const isValidEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
  const emailError = query.trim().length > 0 && !isValidEmail(query) ? 'Enter a valid email' : null;

  const initial = (name: string) => name.charAt(0).toUpperCase();

  const headerTitle = isCareReceiver || isAddingCaregiverToTeam ? 'Add Caregiver' : 'Add Care Receiver';
  const pageTitle = isCareReceiver || isAddingCaregiverToTeam ? 'Find a Caregiver' : 'Find an Existing Profile';
  const pageSubtitle = isCareReceiver || isAddingCaregiverToTeam
    ? 'Search by name or email to find and add a caregiver to the team.'
    : "Search by email or phone number to connect to a loved one's profile.";
  const placeholder = isCareReceiver || isAddingCaregiverToTeam
    ? 'Search by name or email'
    : 'Search by email or phone number';
  const inviteLinkLabel = isCareReceiver || isAddingCaregiverToTeam ? 'Invite a Caregiver' : 'Invite a Care Receiver';

  return (
    <ScreenWrapper bg="#FFFFFF" avoidKeyboard>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#E53935" variant="Linear" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{pageTitle}</Text>
        <Text style={s.subtitle}>{pageSubtitle}</Text>

        {/* Search input */}
        <View style={s.searchBox}>
          <SearchNormal1 size={18} color="#9CA3AF" variant="Linear" />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType={isCareReceiver ? 'default' : 'email-address'}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => runSearch(query)}
          />
          {searching && <ActivityIndicator size="small" color="#E53935" />}
        </View>
        {emailError && <Text style={s.emailError}>{emailError}</Text>}

        {/* Matching Profiles section */}
        {searched && (
          <>
            <Text style={s.sectionLabel}>Matching Profiles</Text>

            {searching ? null : results.length === 0 ? (
              <View style={s.noMatchWrap}>
                <Text style={s.noMatchText}>No matches found.</Text>
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                contentContainerStyle={s.list}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const isActioning = actioning === item.id;
                  return (
                    <View style={s.resultCard}>
                      <View style={s.resultAvatar}>
                        <Text style={s.resultInitial}>{initial(item.fullName)}</Text>
                      </View>
                      <View style={s.resultInfo}>
                        <Text style={s.resultName}>{item.fullName}</Text>
                        {item.email ? (
                          <Text style={s.resultEmail} numberOfLines={1}>
                            {item.email}
                          </Text>
                        ) : null}
                        {item.alreadyAdded && (
                          <Text style={s.alreadyAdded}>Already in your circle</Text>
                        )}
                      </View>
                      {!item.alreadyAdded && (
                        <TouchableOpacity
                          style={[s.addBtn, isActioning && s.addBtnDisabled]}
                          onPress={() => handleAdd(item)}
                          disabled={isActioning}
                          activeOpacity={0.8}
                        >
                          {isActioning ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <UserAdd size={15} color="#FFF" variant="Linear" />
                              <Text style={s.addBtnText}>Add</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
              />
            )}

            {/* Send Invite button — always shown after search */}
            <TouchableOpacity
              style={[s.sendInviteBtn, !!emailError && s.sendInviteBtnDisabled]}
              onPress={handleSendInvite}
              disabled={!!emailError}
              activeOpacity={0.85}
            >
              <Text style={s.sendInviteBtnText}>Send Invite</Text>
            </TouchableOpacity>

            {/* Fallback link below results */}
            {results.length > 0 && (
              <View style={s.inviteLinkRow}>
                <Text style={s.inviteLinkPre}>Not finding who you're looking for?{'  '}</Text>
                <TouchableOpacity onPress={handleSendInvite} activeOpacity={0.7}>
                  <Text style={s.inviteLink}>{inviteLinkLabel}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: F.m.bold, color: '#111', letterSpacing: -0.2 },

  body: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },

  title: {
    fontSize: 28,
    fontFamily: F.m.xBold,
    color: '#111',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: F.i.regular,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 28,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: F.i.regular,
    color: '#111827',
    padding: 0,
  },

  emailError: {
    fontSize: 12,
    fontFamily: F.m.medium,
    color: '#E53935',
    marginTop: -20,
    marginBottom: 16,
    marginLeft: 4,
  },

  sectionLabel: {
    fontSize: 16,
    fontFamily: F.m.bold,
    color: '#111',
    marginBottom: 16,
  },

  noMatchWrap: { alignItems: 'center', paddingVertical: 24 },
  noMatchText: { fontSize: 14, fontFamily: F.i.regular, color: '#9CA3AF' },

  list: { gap: 12, marginBottom: 4 },

  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 14,
  },
  resultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInitial: { fontSize: 22, fontFamily: F.m.bold, color: '#6B7280' },
  resultInfo: { flex: 1, gap: 3 },
  resultName: { fontSize: 16, fontFamily: F.m.bold, color: '#111' },
  resultEmail: { fontSize: 13, fontFamily: F.i.regular, color: '#9CA3AF' },
  alreadyAdded: { fontSize: 12, fontFamily: F.m.semiBold, color: '#10B981' },

  addBtn: {
    backgroundColor: '#E53935',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { fontSize: 14, fontFamily: F.m.bold, color: '#FFF' },

  sendInviteBtn: {
    marginTop: 24,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  sendInviteBtnDisabled: { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  sendInviteBtnText: { fontSize: 17, fontFamily: F.m.bold, color: '#FFF' },

  inviteLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },
  inviteLinkPre: { fontSize: 14, fontFamily: F.i.regular, color: '#6B7280' },
  inviteLink: { fontSize: 14, fontFamily: F.m.semiBold, color: '#E53935' },
});
