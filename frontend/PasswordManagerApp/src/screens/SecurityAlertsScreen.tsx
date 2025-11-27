import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { securityEventsService, SecurityEvent } from '../services/securityEventsService';

interface SecurityAlertsScreenProps {
  onNavigateBack: () => void;
}

const SecurityAlertsScreen: React.FC<SecurityAlertsScreenProps> = ({ onNavigateBack }) => {
  const { colors } = useTheme();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await securityEventsService.listEvents({ page: 1, pageSize: 50 });
      const loadedEvents = response.data || [];
      setEvents(loadedEvents);

      // Marcar automaticamente como lidos os eventos que ainda não foram lidos
      const unreadIds = loadedEvents.filter((e) => !e.readAt).map((e) => e.id);
      if (unreadIds.length > 0) {
        try {
          await securityEventsService.markAsRead(unreadIds);
        } catch (markError) {
          // Não quebrar a tela se falhar ao marcar como lido
          console.error('Erro ao marcar eventos de segurança como lidos:', markError);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar eventos de segurança:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const renderSeverityIcon = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'high':
        return <Ionicons name="alert-circle" size={20} color="#D32F2F" />;
      case 'medium':
        return <Ionicons name="alert-circle" size={20} color="#FFA000" />;
      default:
        return <Ionicons name="information-circle" size={20} color={colors.primary} />;
    }
  };

  const renderItem = ({ item }: { item: SecurityEvent }) => {
    const isUnread = !item.readAt;
    const createdAtLabel = new Date(item.createdAt).toLocaleString('pt-BR');
    return (
      <View
        style={[
          styles.itemContainer,
          { backgroundColor: colors.card, borderColor: colors.border },
          isUnread && styles.itemUnread,
        ]}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleRow}>
            {renderSeverityIcon(item.severity)}
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
        </View>
        <Text style={[styles.itemMessage, { color: colors.mutedText }]} numberOfLines={3}>
          {`${item.message}\n${createdAtLabel}`}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }] }>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }] }>
        <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notificações de Segurança</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedText }]}>Carregando alertas...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={events.length === 0 ? styles.emptyListContainer : styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark" size={64} color={colors.mutedText} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum alerta de segurança</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>Suas atividades recentes parecem seguras.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  itemContainer: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemUnread: {
    borderWidth: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  itemDate: {
    fontSize: 12,
  },
  itemMessage: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SecurityAlertsScreen;
