
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Task = {
  id: string;
  title: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  completed: boolean;
};

const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Complete Software Engineering report',
    category: 'College',
    priority: 'High',
    dueDate: 'Today',
    completed: false,
  },
  {
    id: '2',
    title: 'Review project requirements',
    category: 'Project',
    priority: 'Medium',
    dueDate: 'Tomorrow',
    completed: false,
  },
  {
    id: '3',
    title: 'Prepare weekly progress update',
    category: 'College',
    priority: 'Low',
    dueDate: 'Oct 28',
    completed: true,
  },
];

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTitle, setNewTitle] = useState('');
  const [showInput, setShowInput] = useState(false);

  const completedCount = tasks.filter(task => task.completed).length;
  const pendingCount = tasks.length - completedCount;

  function toggleTask(id: string) {
    setTasks(current =>
      current.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  function addTask() {
    const title = newTitle.trim();

    if (!title) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a task title.');
      } else {
        Alert.alert('Task title required', 'Please enter a task title.');
      }
      return;
    }

    setTasks(current => [
      {
        id: Date.now().toString(),
        title,
        category: 'Personal',
        priority: 'Medium',
        dueDate: 'No date',
        completed: false,
      },
      ...current,
    ]);

    setNewTitle('');
    setShowInput(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={tasks}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View>
            <Text style={styles.eyebrow}>YOUR PERSONAL WORKSPACE</Text>
            <Text style={styles.heading}>Task Manager</Text>
            <Text style={styles.subtitle}>
              Stay organized. Get things done.
            </Text>

            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, styles.totalCard]}>
                <Text style={styles.summaryLabel}>TOTAL TASKS</Text>
                <Text style={styles.summaryNumber}>{tasks.length}</Text>
              </View>

              <View style={[styles.summaryCard, styles.pendingCard]}>
                <Text style={styles.summaryLabel}>PENDING</Text>
                <Text style={styles.summaryNumber}>{pendingCount}</Text>
              </View>

              <View style={[styles.summaryCard, styles.completedCard]}>
                <Text style={styles.summaryLabel}>COMPLETED</Text>
                <Text style={styles.summaryNumber}>{completedCount}</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>My tasks</Text>
                <Text style={styles.sectionSubtitle}>
                  Your tasks at a glance
                </Text>
              </View>

              <Pressable
                style={styles.addButton}
                onPress={() => setShowInput(value => !value)}
              >
                <Text style={styles.addButtonText}>
                  {showInput ? 'Cancel' : '+ Add task'}
                </Text>
              </Pressable>
            </View>

            {showInput && (
              <View style={styles.inputCard}>
                <TextInput
                  style={styles.input}
                  placeholder="What do you need to do?"
                  placeholderTextColor="#8991A5"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  onSubmitEditing={addTask}
                  returnKeyType="done"
                />
                <Pressable style={styles.saveButton} onPress={addTask}>
                  <Text style={styles.saveButtonText}>Save task</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.taskCard, item.completed && styles.doneCard]}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.completed }}
              style={[
                styles.checkbox,
                item.completed && styles.checkedBox,
              ]}
              onPress={() => toggleTask(item.id)}
            >
              <Text style={styles.checkmark}>
                {item.completed ? '✓' : ''}
              </Text>
            </Pressable>

            <View style={styles.taskDetails}>
              <Text
                style={[
                  styles.taskTitle,
                  item.completed && styles.completedTitle,
                ]}
              >
                {item.title}
              </Text>

              <Text style={styles.taskMeta}>
                {item.category}  ·  Due: {item.dueDate}
              </Text>

              <View style={styles.taskFooter}>
                <Text
                  style={[
                    styles.priority,
                    item.priority === 'High' && styles.highPriority,
                    item.priority === 'Medium' && styles.mediumPriority,
                    item.priority === 'Low' && styles.lowPriority,
                  ]}
                >
                  {item.priority} priority
                </Text>

                <Text style={styles.status}>
                  {item.completed ? 'Completed' : 'In progress'}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.sectionSubtitle}>
              Add a task to get started.
            </Text>
          </View>
        }
        ListFooterComponent={
          <Text style={styles.footer}>
            Small steps lead to big achievements.
          </Text>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  list: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 850,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 32,
  },
  eyebrow: {
    color: '#6474D9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heading: {
    color: '#20243A',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#7B8195',
    fontSize: 15,
    marginTop: 7,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 26,
  },
  summaryCard: {
    flex: 1,
    minHeight: 100,
    padding: 13,
    borderRadius: 15,
    justifyContent: 'space-between',
  },
  totalCard: {
    backgroundColor: '#E8EBFF',
  },
  pendingCard: {
    backgroundColor: '#FFF0D9',
  },
  completedCard: {
    backgroundColor: '#DDF7EA',
  },
  summaryLabel: {
    color: '#626982',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryNumber: {
    color: '#20243A',
    fontSize: 28,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    color: '#20243A',
    fontSize: 21,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#858BA0',
    fontSize: 12,
    marginTop: 5,
  },
  addButton: {
    backgroundColor: '#5968D8',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7E9F2',
  },
  input: {
    color: '#20243A',
    backgroundColor: '#F6F7FB',
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
  },
  saveButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#20243A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9,
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9EBF3',
  },
  doneCard: {
    backgroundColor: '#FBFCFE',
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#C6CBDA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
    marginTop: 2,
  },
  checkedBox: {
    backgroundColor: '#5968D8',
    borderColor: '#5968D8',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    color: '#292D43',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  completedTitle: {
    color: '#9096A8',
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    color: '#858BA0',
    fontSize: 11,
    marginTop: 6,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  priority: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    overflow: 'hidden',
  },
  highPriority: {
    color: '#B84040',
    backgroundColor: '#FFE8E7',
  },
  mediumPriority: {
    color: '#9A690E',
    backgroundColor: '#FFF0D2',
  },
  lowPriority: {
    color: '#27835B',
    backgroundColor: '#DDF7EA',
  },
  status: {
    color: '#858BA0',
    fontSize: 10,
  },
  separator: {
    height: 11,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#292D43',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
  },
  footer: {
    textAlign: 'center',
    color: '#9A9FB0',
    fontSize: 11,
    marginTop: 26,
  },
});
