import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Flame, 
  User, 
  Users, 
  Tag, 
  Search, 
  CheckCheck, 
  AlertCircle, 
  Layers, 
  Download, 
  FileText, 
  Zap, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Share2 
} from 'lucide-react';
import { translations, Language } from '../translations';
import { db, collection, doc, onSnapshot, setDoc, deleteDoc, handleFirestoreError, OperationType, removeUndefinedFields } from '../lib/firebase';
import { Player, SquadTask, TaskCategory, TaskPriority } from '../types';

interface TeamTasksSectionProps {
  players: Player[];
  currentUser: {
    name: string;
    username: string;
    avatar?: string;
  } | null;
  isMasterUser: boolean;
  lang: Language;
}

const DEFAULT_PRESET_TASKS: Omit<SquadTask, 'id' | 'importedAt' | 'isCompleted'>[] = [
  {
    title: 'تجهيز الزي الأساسي ومعدات اللقاء',
    description: 'التأكد من إحضار الطقم الرسمي، واقي الساق، والحذاء المناسب لأرضية الملعب قبل موعد المباراة بـ 45 دقيقة.',
    category: 'MATCHDAY',
    priority: 'URGENT',
    assignedTo: 'ALL',
    assignedToName: 'كامل الفريق',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    dueTime: '17:00',
    importedBy: 'علي حسام (Captain)',
    rewardXp: 50
  },
  {
    title: 'مراجعة خطة الضربات الثابتة والركنيات',
    description: 'التركيز على تمركز المدافعين في الركنيات الدفاعية وتوزيع الأدوار في الهجمات المرتدة السريعة.',
    category: 'TACTICAL',
    priority: 'HIGH',
    assignedTo: 'ALL',
    assignedToName: 'كامل الفريق',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    dueTime: '18:00',
    importedBy: 'علي حسام (Captain)',
    rewardXp: 40
  },
  {
    title: 'تمارين الإحماء ورفع اللياقة البدنية والسرعة',
    description: 'تدريبات الجري المكوكي والإطالات الديناميكية لتقليل احتمالية الإصابات العضلية ورفع معدل التحمل.',
    category: 'FITNESS',
    priority: 'MEDIUM',
    assignedTo: 'ALL',
    assignedToName: 'كامل الفريق',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    dueTime: '19:30',
    importedBy: 'علي حسام (Captain)',
    rewardXp: 30
  }
];

export const TeamTasksSection: React.FC<TeamTasksSectionProps> = ({
  players,
  currentUser,
  isMasterUser,
  lang
}) => {
  const t = translations[lang];

  // Tasks state
  const [tasks, setTasks] = useState<SquadTask[]>(() => {
    try {
      const cached = localStorage.getItem('pharaohs_squad_tasks');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
    return [];
  });

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'URGENT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [editingTask, setEditingTask] = useState<SquadTask | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<TaskCategory>('MATCHDAY');
  const [formPriority, setFormPriority] = useState<TaskPriority>('HIGH');
  const [formAssignedTo, setFormAssignedTo] = useState<string>('ALL');
  const [formDueDate, setFormDueDate] = useState<string>(() => {
    const nextDate = new Date(Date.now() + 86400000);
    return nextDate.toISOString().split('T')[0];
  });
  const [formDueTime, setFormDueTime] = useState<string>('18:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<SquadTask | null>(null);
  const [showClearCompletedModal, setShowClearCompletedModal] = useState(false);

  // Real-time Firestore Sync for all accounts & devices worldwide
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, 'tasks'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: SquadTask[] = [];
            snapshot.forEach((d) => {
              const data = d.data() as SquadTask;
              // Ensure doc ID is always consistent with task.id
              list.push({ ...data, id: data.id || d.id });
            });
            // Sort: Incomplete tasks first, then by priority (URGENT > HIGH > MEDIUM > LOW), then by due date
            list.sort((a, b) => {
              if (a.isCompleted !== b.isCompleted) {
                return a.isCompleted ? 1 : -1;
              }
              const priorityWeight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
              const pA = priorityWeight[a.priority] || 0;
              const pB = priorityWeight[b.priority] || 0;
              if (pA !== pB) return pB - pA;
              return (a.dueDate || '').localeCompare(b.dueDate || '');
            });

            setTasks(list);
            try {
              localStorage.setItem('pharaohs_squad_tasks', JSON.stringify(list));
            } catch (e) {}
          } else {
            // When all tasks are deleted by Ali Hossam, immediately clear state across all devices
            setTasks([]);
            try {
              localStorage.setItem('pharaohs_squad_tasks', JSON.stringify([]));
            } catch (e) {}
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'tasks');
        }
      );

      return () => unsub();
    } catch (err) {
      console.warn('Firestore tasks sync error:', err);
    }
  }, []);

  const showToast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => {
      setNotificationToast(null);
    }, 3500);
  };

  const seedInitialTasks = async () => {
    const initialList: SquadTask[] = DEFAULT_PRESET_TASKS.map((preset, idx) => ({
      ...preset,
      id: `task-init-${Date.now()}-${idx}`,
      isCompleted: false,
      importedAt: new Date().toISOString(),
      orderIndex: idx
    }));

    for (const tItem of initialList) {
      try {
        await setDoc(doc(db, 'tasks', tItem.id), removeUndefinedFields(tItem));
      } catch (e) {
        console.error('Error seeding initial tasks:', e);
      }
    }
  };

  const handleOpenAddModal = (taskToEdit?: SquadTask) => {
    if (taskToEdit) {
      setEditingTask(taskToEdit);
      setFormTitle(taskToEdit.title);
      setFormDescription(taskToEdit.description || '');
      setFormCategory(taskToEdit.category);
      setFormPriority(taskToEdit.priority);
      setFormAssignedTo(taskToEdit.assignedTo || 'ALL');
      setFormDueDate(taskToEdit.dueDate || new Date().toISOString().split('T')[0]);
      setFormDueTime(taskToEdit.dueTime || '18:00');
    } else {
      setEditingTask(null);
      setFormTitle('');
      setFormDescription('');
      setFormCategory('MATCHDAY');
      setFormPriority('HIGH');
      setFormAssignedTo('ALL');
      const tomorrow = new Date(Date.now() + 86400000);
      setFormDueDate(tomorrow.toISOString().split('T')[0]);
      setFormDueTime('18:00');
    }
    setShowAddModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const assignedPlayer = players.find(p => p.id === formAssignedTo);
      const assignedName = formAssignedTo === 'ALL' 
        ? (lang === 'ar' ? 'كامل الفريق' : 'All Squad Members') 
        : (assignedPlayer ? assignedPlayer.name : formAssignedTo);

      if (editingTask) {
        const updated: SquadTask = {
          ...editingTask,
          title: formTitle.trim(),
          description: formDescription.trim(),
          category: formCategory,
          priority: formPriority,
          assignedTo: formAssignedTo,
          assignedToName: assignedName,
          dueDate: formDueDate,
          dueTime: formDueTime
        };

        await setDoc(doc(db, 'tasks', updated.id), removeUndefinedFields(updated));
        showToast(t.taskUpdatedSuccess || 'Task updated and synced globally!');
      } else {
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newTask: SquadTask = {
          id: taskId,
          title: formTitle.trim(),
          description: formDescription.trim(),
          category: formCategory,
          priority: formPriority,
          assignedTo: formAssignedTo,
          assignedToName: assignedName,
          dueDate: formDueDate,
          dueTime: formDueTime,
          isCompleted: false,
          importedBy: currentUser?.name ? `${currentUser.name} (Captain)` : 'Ali Hossam (Captain)',
          importedAt: new Date().toISOString(),
          rewardXp: formPriority === 'URGENT' ? 60 : formPriority === 'HIGH' ? 45 : 30
        };

        await setDoc(doc(db, 'tasks', taskId), removeUndefinedFields(newTask));
        showToast(t.taskCreatedSuccess || 'Task imported & published successfully!');
      }

      setShowAddModal(false);
      setEditingTask(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'tasks');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle task complete / incomplete (Ali Hossam only)
  const handleToggleTaskStatus = async (task: SquadTask) => {
    if (!isMasterUser) {
      showToast(lang === 'ar' ? '🔒 فقط الكابتن علي حسام يملك صلاحية تحديد إنجاز المهام' : '🔒 Only Captain Ali Hossam can sign off on tasks');
      return;
    }

    const nextCompleted = !task.isCompleted;
    const updated: SquadTask = {
      ...task,
      isCompleted: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : null,
      completedBy: nextCompleted ? (currentUser?.name ? `${currentUser.name} (Captain)` : 'Ali Hossam (Captain)') : null
    };

    // Optimistic local state update for fast UI
    setTasks(prev => prev.map(tItem => tItem.id === task.id ? updated : tItem));

    try {
      await setDoc(doc(db, 'tasks', task.id), removeUndefinedFields(updated));
      showToast(nextCompleted ? (lang === 'ar' ? '✅ تم إنجاز المهمة ومزامنتها للجميع!' : '✅ Task marked as completed & synced!') : (lang === 'ar' ? '🔄 تم إعادة فتح المهمة' : '🔄 Task reopened'));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tasks/${task.id}`);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!isMasterUser || !taskToDelete) return;
    const targetId = taskToDelete.id;
    setIsSubmitting(true);

    // Optimistic UI state update
    setTasks(prev => prev.filter(tItem => tItem.id !== targetId));
    setTaskToDelete(null);
    if (editingTask?.id === targetId) {
      setShowAddModal(false);
      setEditingTask(null);
    }

    try {
      await deleteDoc(doc(db, 'tasks', targetId));
      showToast(t.taskDeletedSuccess || 'Task deleted and removed globally!');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tasks/${targetId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCompletedTasks = async () => {
    if (!isMasterUser) return;
    setIsSubmitting(true);
    const completedList = tasks.filter(tItem => tItem.isCompleted);

    setTasks(prev => prev.filter(tItem => !tItem.isCompleted));
    setShowClearCompletedModal(false);

    try {
      for (const tItem of completedList) {
        await deleteDoc(doc(db, 'tasks', tItem.id));
      }
      showToast(t.completedTasksClearedSuccess || 'All completed tasks have been deleted!');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'tasks');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Import Presets Pack
  const handleImportPresetPack = async (packType: 'MATCHDAY' | 'FITNESS' | 'TACTICAL') => {
    if (!isMasterUser) return;
    setIsSubmitting(true);

    let packItems: Omit<SquadTask, 'id' | 'importedAt' | 'isCompleted'>[] = [];

    if (packType === 'MATCHDAY') {
      packItems = [
        {
          title: 'فحص الجاهزية البدنية والزي الرسمي',
          description: 'تأكيد الحضور المبكر وتجهيز الزي الأساسي وواقي الساق وحذاء العشب الصناعي.',
          category: 'MATCHDAY',
          priority: 'URGENT',
          assignedTo: 'ALL',
          assignedToName: 'كامل الفريق',
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          dueTime: '17:30',
          importedBy: 'علي حسام (Captain)',
          rewardXp: 50
        },
        {
          title: 'جلسة التوجيه التكتيكي والكرات الثابتة',
          description: 'شرح تحركات الركنيات الهجومية والدفاعية وتوزيع المراقبة الفردية على أخطر مهاجمي الخصم.',
          category: 'TACTICAL',
          priority: 'HIGH',
          assignedTo: 'ALL',
          assignedToName: 'كامل الفريق',
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          dueTime: '18:15',
          importedBy: 'علي حسام (Captain)',
          rewardXp: 45
        },
        {
          title: 'بروتوكول شرب السوائل والتغذية السليمة',
          description: 'شرب كميات كافية من الماء وتناول وجبة كربوهيدرات خفيفة قبل المباراة بساعتين.',
          category: 'MATCHDAY',
          priority: 'HIGH',
          assignedTo: 'ALL',
          assignedToName: 'كامل الفريق',
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          dueTime: '16:00',
          importedBy: 'علي حسام (Captain)',
          rewardXp: 30
        }
      ];
    } else if (packType === 'FITNESS') {
      packItems = [
        {
          title: 'تمارين السرعة والانفجارية (Sprint Drills)',
          description: 'تدريبات الانطلاق السريع لمسافة 30 متر مع التكرار لرفع السرعة القصوى أثناء التحولات.',
          category: 'FITNESS',
          priority: 'HIGH',
          assignedTo: 'ALL',
          assignedToName: 'كامل الفريق',
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          dueTime: '19:00',
          importedBy: 'علي حسام (Captain)',
          rewardXp: 40
        },
        {
          title: 'تمارين عضلات البطن والجذع والاستشفاء',
          description: 'جلسة تقوية عضلات الكور والإطالات الثابتة لمنع الشد العضلي وتسريع الاستشفاء.',
          category: 'FITNESS',
          priority: 'MEDIUM',
          assignedTo: 'ALL',
          assignedToName: 'كامل الفريق',
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          dueTime: '20:00',
          importedBy: 'علي حسام (Captain)',
          rewardXp: 35
        }
      ];
    } else if (packType === 'TACTICAL') {
      packItems = [
        {
          title: 'التدريب على الضغط العالي واستعادة الكرة',
          description: 'تطبيق ضغط منظم في الثلث الأمامي لقطع الكرة في مناطق الخطورة وإحراز أهداف سريعة.',
          category: 'TACTICAL',
          priority: 'URGENT',
          assignedTo: 'ALL',
          assignedToName: 'كامل الفريق',
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          dueTime: '18:30',
          importedBy: 'علي حسام (Captain)',
          rewardXp: 55
        },
        {
          title: 'تدريبات التسديد من خارج منطقة الجزاء والكرات المرتدة',
          description: 'متابعة الكرات المرتدة من حارس المرمى والتسديد المتقن والمباغت نحو الزوايا البعيدة.',
          category: 'TRAINING',
          priority: 'HIGH',
          assignedTo: 'ALL',
          assignedToName: 'كامل الفريق',
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          dueTime: '19:00',
          importedBy: 'علي حسام (Captain)',
          rewardXp: 45
        }
      ];
    }

    try {
      for (const item of packItems) {
        const taskId = `task-pack-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const fullTask: SquadTask = {
          ...item,
          id: taskId,
          isCompleted: false,
          importedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'tasks', taskId), removeUndefinedFields(fullTask));
      }
      showToast(t.bulkTasksImportedSuccess || 'Task pack imported successfully!');
      setShowPresetsModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'tasks');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Import JSON Tasks
  const handleImportJson = async () => {
    if (!isMasterUser || !jsonInput.trim()) return;
    setJsonError('');

    try {
      const parsed = JSON.parse(jsonInput.trim());
      const list = Array.isArray(parsed) ? parsed : [parsed];

      setIsSubmitting(true);
      for (const item of list) {
        if (!item.title) continue;
        const taskId = `task-json-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newTask: SquadTask = {
          id: taskId,
          title: String(item.title),
          description: item.description ? String(item.description) : '',
          category: item.category && ['MATCHDAY', 'TRAINING', 'TACTICAL', 'FITNESS', 'ADMIN', 'COMMUNITY'].includes(item.category) ? item.category : 'MATCHDAY',
          priority: item.priority && ['URGENT', 'HIGH', 'MEDIUM', 'LOW'].includes(item.priority) ? item.priority : 'HIGH',
          assignedTo: item.assignedTo || 'ALL',
          assignedToName: item.assignedToName || (item.assignedTo === 'ALL' ? 'كامل الفريق' : 'All Squad'),
          dueDate: item.dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
          dueTime: item.dueTime || '18:00',
          isCompleted: Boolean(item.isCompleted),
          importedBy: currentUser?.name ? `${currentUser.name} (Captain)` : 'Ali Hossam (Captain)',
          importedAt: new Date().toISOString(),
          rewardXp: item.rewardXp || 35
        };

        await setDoc(doc(db, 'tasks', taskId), removeUndefinedFields(newTask));
      }

      showToast(t.bulkTasksImportedSuccess || 'Tasks imported successfully!');
      setShowJsonModal(false);
      setJsonInput('');
    } catch (e: any) {
      setJsonError(t.invalidJsonError || 'Invalid JSON syntax. Please verify format.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === 'ACTIVE' && task.isCompleted) return false;
    if (statusFilter === 'COMPLETED' && !task.isCompleted) return false;
    if (statusFilter === 'URGENT' && task.priority !== 'URGENT') return false;

    if (categoryFilter !== 'ALL' && task.category !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchAssignee = task.assignedToName?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAssignee) return false;
    }

    return true;
  });

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(tItem => tItem.isCompleted).length;
  const pendingTasksCount = totalTasksCount - completedTasksCount;
  const urgentCount = tasks.filter(tItem => tItem.priority === 'URGENT' && !tItem.isCompleted).length;
  const completionPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Category styles and labels
  const getCategoryMeta = (cat: TaskCategory) => {
    switch (cat) {
      case 'MATCHDAY':
        return {
          label: t.categoryMatchday || 'Matchday',
          bg: 'bg-amber-500/15 text-[#FFD700] border-amber-500/30',
          dot: 'bg-amber-400',
          icon: '⚽'
        };
      case 'TRAINING':
        return {
          label: t.categoryTraining || 'Training',
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
          icon: '🏃'
        };
      case 'TACTICAL':
        return {
          label: t.categoryTactical || 'Tactical',
          bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          dot: 'bg-blue-400',
          icon: '🎯'
        };
      case 'FITNESS':
        return {
          label: t.categoryFitness || 'Fitness',
          bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          dot: 'bg-purple-400',
          icon: '⚡'
        };
      case 'ADMIN':
        return {
          label: t.categoryAdmin || 'Admin & Squad',
          bg: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
          dot: 'bg-zinc-400',
          icon: '📋'
        };
      case 'COMMUNITY':
        return {
          label: t.categoryCommunity || 'Community',
          bg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
          dot: 'bg-teal-400',
          icon: '💬'
        };
      default:
        return {
          label: cat,
          bg: 'bg-white/10 text-white/80 border-white/20',
          dot: 'bg-white/40',
          icon: '📌'
        };
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 shadow-[0_0_8px_rgba(239,68,68,0.25)] animate-pulse">
            <Flame className="w-2.5 h-2.5 fill-red-400" />
            <span>{t.priorityUrgent || 'URGENT'}</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center gap-1">
            <span>⚡ {t.priorityHigh || 'HIGH'}</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium uppercase font-mono bg-yellow-500/15 text-yellow-300/90 border border-yellow-500/30">
            {t.priorityMedium || 'MED'}
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium uppercase font-mono bg-white/10 text-white/50 border border-white/10">
            {t.priorityLow || 'LOW'}
          </span>
        );
    }
  };

  const formatDueDateDisplay = (dueDate?: string, dueTime?: string) => {
    if (!dueDate) return null;
    try {
      const target = new Date(`${dueDate}T${dueTime || '00:00'}`);
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return { text: lang === 'ar' ? 'اليوم' : 'Today', isUrgent: true };
      }
      if (diffDays === 1) {
        return { text: lang === 'ar' ? 'غداً' : 'Tomorrow', isUrgent: false };
      }
      if (diffDays < 0) {
        return { text: lang === 'ar' ? 'مستحق الآن' : 'Overdue', isUrgent: true };
      }
      return { 
        text: lang === 'ar' ? `خلال ${diffDays} أيام` : `In ${diffDays} days`, 
        isUrgent: false 
      };
    } catch (e) {
      return { text: dueDate, isUrgent: false };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-6">
      
      {/* HEADER & GLOBAL SYNC STATUS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest bg-[#D4AF37]/20 text-[#FFD700] px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40 font-mono flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3 h-3 text-[#FFD700]" />
              <span>{lang === 'ar' ? 'غرفة عمليات الفريق' : 'SQUAD OPS & MISSIONS'}</span>
            </span>
            <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Firebase Live Sync</span>
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#FFD700]" />
            <span>{t.tasksTitle || 'Squad Tasks & Missions'}</span>
          </h2>
          <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
            {t.tasksSubtitle || 'Official team tasks, match preparation, and duties managed by Captain Ali Hossam'}
          </p>
        </div>

        {/* Action Buttons for Ali Hossam */}
        {isMasterUser && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="px-3.5 py-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] hover:brightness-110 text-black font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all transform active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t.importTask || 'Import New Task'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPresetsModal(true)}
              className="px-2.5 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0"
              title={t.quickImportPresets || 'Import Task Packs'}
            >
              <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
              <span className="hidden sm:inline">{t.quickImportPresets || 'Presets'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowJsonModal(true)}
              className="px-2.5 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0"
              title="JSON Import"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
            </button>
          </div>
        )}
      </div>

      {/* NOTIFICATION TOAST */}
      <AnimatePresence>
        {notificationToast && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="p-3 bg-[#1e1705] border-2 border-[#FFD700] text-[#FFD700] rounded-2xl shadow-[0_0_20px_rgba(255,215,0,0.25)] flex items-center justify-between gap-2 text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFD700] shrink-0" />
              <span>{notificationToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotificationToast(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SQUAD COMPLETION RATE PROGRESS CARD */}
      <div className="bg-gradient-to-br from-black via-[#161208] to-black border border-[#D4AF37]/40 p-4 sm:p-5 rounded-3xl shadow-[0_0_25px_rgba(212,175,55,0.12)] space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#FFD700]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-[#D4AF37] tracking-wider block">
              {t.squadCompletionRate || 'Squad Completion Rate'}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="text-2xl sm:text-3xl font-black text-white font-mono">
                {completionPercentage}%
              </h3>
              <span className="text-xs text-white/50 font-mono">
                ({completedTasksCount} / {totalTasksCount} {lang === 'ar' ? 'مهمة منجزة' : 'tasks done'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
            <div className="px-2.5 py-1.5 bg-black/60 rounded-xl border border-white/10 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-white/60">{t.completedTasks || 'Done'}:</span>
              <span className="font-bold text-white">{completedTasksCount}</span>
            </div>
            <div className="px-2.5 py-1.5 bg-black/60 rounded-xl border border-white/10 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-white/60">{t.activeTasks || 'Pending'}:</span>
              <span className="font-bold text-white">{pendingTasksCount}</span>
            </div>
            {urgentCount > 0 && (
              <div className="px-2.5 py-1.5 bg-red-500/15 rounded-xl border border-red-500/30 flex items-center gap-1.5 text-red-400">
                <Flame className="w-3 h-3 fill-red-400" />
                <span className="font-bold">{urgentCount} {t.urgentTasks || 'Urgent'}</span>
              </div>
            )}

            {isMasterUser && completedTasksCount > 0 && (
              <button
                type="button"
                onClick={() => setShowClearCompletedModal(true)}
                className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl flex items-center gap-1.5 font-bold transition-all active:scale-95 text-[11px]"
                title={t.clearCompletedTasks || (lang === 'ar' ? 'مسح المهام المكتملة' : 'Clear Completed')}
              >
                <Trash2 className="w-3 h-3" />
                <span>{t.clearCompletedTasks || (lang === 'ar' ? 'مسح المكتملة' : 'Clear Completed')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5 relative z-10 border border-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-emerald-400 shadow-[0_0_12px_rgba(255,215,0,0.6)]"
          />
        </div>

        {/* Permissions & Sync Explanatory Notice */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60 relative z-10">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#FFD700] shrink-0" />
            <span className="text-[10px] sm:text-xs">
              {isMasterUser ? (t.onlyAliCanManageTasks || '👑 Exclusive Captain Ali Hossam control. Changes sync worldwide.') : (t.viewerTasksNotice || '🌐 Official squad tasks curated by Captain Ali Hossam (Live synced via Firebase).')}
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="space-y-2.5">
        {/* Status Tab Filters */}
        <div className="grid grid-cols-4 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`py-1.5 px-2 rounded-xl font-bold transition-all text-center ${
              statusFilter === 'ALL'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {t.allTasks || 'All'} ({totalTasksCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`py-1.5 px-2 rounded-xl font-bold transition-all text-center ${
              statusFilter === 'ACTIVE'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {t.activeTasks || 'Pending'} ({pendingTasksCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`py-1.5 px-2 rounded-xl font-bold transition-all text-center ${
              statusFilter === 'COMPLETED'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {t.completedTasks || 'Done'} ({completedTasksCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('URGENT')}
            className={`py-1.5 px-2 rounded-xl font-bold transition-all text-center ${
              statusFilter === 'URGENT'
                ? 'bg-red-500 text-white shadow-md'
                : 'text-red-400/80 hover:text-red-300'
            }`}
          >
            🔥 {t.urgentTasks || 'Urgent'} ({urgentCount})
          </button>
        </div>

        {/* Search and Category Quick Chips */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchTasks || 'Search tasks by title or assignee...'}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {['ALL', 'MATCHDAY', 'TRAINING', 'TACTICAL', 'FITNESS', 'ADMIN'].map((catKey) => {
              const isActive = categoryFilter === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setCategoryFilter(catKey)}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase font-mono whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-white/20 text-white border-white/40 shadow-sm'
                      : 'bg-black/40 text-white/40 border-white/5 hover:text-white/80'
                  }`}
                >
                  {catKey === 'ALL' ? (lang === 'ar' ? 'الكل' : 'All') : catKey}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TASKS LIST RENDERING */}
      {filteredTasks.length === 0 ? (
        <div className="p-8 bg-white/5 border border-white/10 rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white">
              {t.noTasksTitle || 'No Tasks Assigned Yet'}
            </h4>
            <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto leading-relaxed">
              {t.noTasksDesc || 'Captain Ali Hossam will import and assign squad tasks here, syncing live across all devices worldwide.'}
            </p>
          </div>
          {isMasterUser && (
            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c2a030] text-black font-extrabold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.importTask || 'Import New Task'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPresetsModal(true)}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/10 transition-all inline-flex items-center gap-1.5 active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
                <span>{t.quickImportPresets || 'Load Preset Packs'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <motion.div 
          layout
          className="space-y-2.5"
        >
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task) => {
              const catMeta = getCategoryMeta(task.category);
              const dueInfo = formatDueDateDisplay(task.dueDate, task.dueTime);
              const isExpanded = expandedTaskId === task.id;

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
                    task.isCompleted
                      ? 'bg-black/40 border-emerald-500/30 opacity-80'
                      : task.priority === 'URGENT'
                      ? 'bg-gradient-to-r from-red-950/40 via-black to-black border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                      : 'bg-white/5 border-white/10 hover:border-[#D4AF37]/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Checkbox / Toggle Button */}
                    <div className="pt-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTaskStatus(task)}
                        disabled={!isMasterUser}
                        title={isMasterUser ? (task.isCompleted ? t.markTaskIncomplete : t.markTaskComplete) : (lang === 'ar' ? 'خاص بالكابتن علي حسام' : 'Captain Ali Hossam Only')}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all transform active:scale-90 ${
                          task.isCompleted
                            ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                            : isMasterUser
                            ? 'border-2 border-white/30 hover:border-[#FFD700] hover:bg-[#FFD700]/10 text-transparent'
                            : 'border-2 border-white/20 text-transparent opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 stroke-[3] ${task.isCompleted ? 'block' : 'opacity-0'}`} />
                      </button>
                    </div>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {/* Category Chip */}
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase font-mono border flex items-center gap-1 ${catMeta.bg}`}>
                          <span>{catMeta.icon}</span>
                          <span>{catMeta.label}</span>
                        </span>

                        {/* Priority Badge */}
                        {getPriorityBadge(task.priority)}

                        {/* Due Date Indicator */}
                        {dueInfo && (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold flex items-center gap-1 ${
                            dueInfo.isUrgent
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-black/50 text-white/60 border border-white/10'
                          }`}>
                            <Clock className="w-2.5 h-2.5" />
                            <span>{dueInfo.text}</span>
                            {task.dueTime && <span className="opacity-70">({task.dueTime})</span>}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className={`text-xs sm:text-sm font-bold text-white transition-all ${
                        task.isCompleted ? 'line-through text-white/50' : ''
                      }`}>
                        {task.title}
                      </h4>

                      {/* Assignee & Sub Info */}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/50 flex-wrap font-mono">
                        <div className="flex items-center gap-1 text-white/80 font-bold">
                          {task.assignedTo === 'ALL' ? (
                            <Users className="w-3 h-3 text-[#FFD700]" />
                          ) : (
                            <User className="w-3 h-3 text-blue-400" />
                          )}
                          <span>{task.assignedToName || (task.assignedTo === 'ALL' ? 'كامل الفريق' : task.assignedTo)}</span>
                        </div>

                        {task.isCompleted && task.completedBy && (
                          <div className="flex items-center gap-1 text-emerald-400 font-bold">
                            <ShieldCheck className="w-3 h-3" />
                            <span>{t.completedBy || 'Done by'}: {task.completedBy}</span>
                          </div>
                        )}
                      </div>

                      {/* Expandable Notes / Description */}
                      {task.description && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                            className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1 font-mono font-bold"
                          >
                            <span>{isExpanded ? (lang === 'ar' ? 'إخفاء التفاصيل' : 'Hide Details') : (lang === 'ar' ? 'عرض التفاصيل والتعليمات' : 'View Instructions')}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 p-2.5 bg-black/60 rounded-xl border border-white/10 text-xs text-white/80 leading-relaxed font-sans"
                              >
                                {task.description}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                    {/* Master Controls (Edit & Delete) */}
                    {isMasterUser && (
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleOpenAddModal(task)}
                          className="p-1.5 hover:bg-white/10 text-white/40 hover:text-[#FFD700] rounded-lg transition-colors"
                          title={t.editTaskBtn || 'Edit Task'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(task)}
                          className="p-1.5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg transition-colors"
                          title={t.deleteTask || (lang === 'ar' ? 'حذف المهمة' : 'Delete Task')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* CREATE / EDIT TASK MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#141414] border border-[#D4AF37]/50 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-[0_0_40px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto space-y-4 scrollbar-thin"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#D4AF37] text-black font-black flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      {editingTask ? (t.editTaskBtn || 'Edit Task') : (t.importTask || 'Import New Task')}
                    </h3>
                    <p className="text-[10px] text-white/40 font-mono">
                      {lang === 'ar' ? 'تتزامن التغييرات فورياً مع كافة الأجهزة' : 'Syncs in real time across all accounts'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTask} className="space-y-3.5">
                {/* Title */}
                <div>
                  <label className="text-[10px] uppercase font-mono text-white/50 mb-1 block">
                    {t.taskTitle || 'Task Title'} *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={t.taskTitlePlaceholder || 'e.g. Set-piece tactical briefing & jersey preparation'}
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-mono text-white/50 mb-1 block">
                      {t.taskCategory || 'Category'}
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as TaskCategory)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="MATCHDAY">⚽ {t.categoryMatchday || 'Matchday'}</option>
                      <option value="TRAINING">🏃 {t.categoryTraining || 'Training'}</option>
                      <option value="TACTICAL">🎯 {t.categoryTactical || 'Tactical'}</option>
                      <option value="FITNESS">⚡ {t.categoryFitness || 'Fitness'}</option>
                      <option value="ADMIN">📋 {t.categoryAdmin || 'Admin & Squad'}</option>
                      <option value="COMMUNITY">💬 {t.categoryCommunity || 'Community'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-white/50 mb-1 block">
                      {t.taskPriority || 'Priority'}
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="URGENT">🔥 {t.priorityUrgent || 'Urgent'}</option>
                      <option value="HIGH">⚡ {t.priorityHigh || 'High'}</option>
                      <option value="MEDIUM">🟡 {t.priorityMedium || 'Medium'}</option>
                      <option value="LOW">⚪ {t.priorityLow || 'Low'}</option>
                    </select>
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <label className="text-[10px] uppercase font-mono text-white/50 mb-1 block">
                    {t.assignTo || 'Assign To'}
                  </label>
                  <select
                    value={formAssignedTo}
                    onChange={(e) => setFormAssignedTo(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="ALL">👥 {t.allSquad || 'All Squad Members'}</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        👤 {p.name} (@{p.username})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-mono text-white/50 mb-1 block">
                      {t.dueDate || 'Due Date'}
                    </label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#D4AF37] [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-mono text-white/50 mb-1 block">
                      {t.dueTime || 'Due Time'}
                    </label>
                    <input
                      type="time"
                      value={formDueTime}
                      onChange={(e) => setFormDueTime(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#D4AF37] [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Notes / Description */}
                <div>
                  <label className="text-[10px] uppercase font-mono text-white/50 mb-1 block">
                    {t.taskNotes || 'Task Details & Instructions'}
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder={t.taskNotesPlaceholder || 'Add specific guidelines, objectives, or instructions...'}
                    rows={3}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] resize-none"
                  />
                </div>

                {/* Action buttons */}
                <div className="pt-2">
                  {editingTask ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTaskToDelete(editingTask);
                        }}
                        disabled={isSubmitting}
                        className="px-3.5 py-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95"
                        title={t.deleteTask || (lang === 'ar' ? 'حذف المهمة' : 'Delete Task')}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.deleteTask || (lang === 'ar' ? 'حذف' : 'Delete')}</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-3 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] hover:brightness-110 text-black font-black text-xs rounded-xl uppercase tracking-wider shadow-[0_0_20px_rgba(255,215,0,0.35)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{t.updateTaskBtn || 'Update Task'}</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] hover:brightness-110 text-black font-black text-xs rounded-xl uppercase tracking-wider shadow-[0_0_20px_rgba(255,215,0,0.35)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{t.saveAndImportTask || 'Save & Sync Task Globally'}</span>
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK PRESET PACKS MODAL */}
      <AnimatePresence>
        {showPresetsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141414] border border-[#FFD700]/50 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-[0_0_40px_rgba(0,0,0,0.9)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#FFD700]" />
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {t.quickImportPresets || 'Quick Import Task Packs'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPresetsModal(false)}
                  className="p-1.5 text-white/40 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-white/60">
                {lang === 'ar' ? 'اختر حزمة مهام جاهزة للاستيراد المباشر بضغطة واحدة ونشرها لجميع الحسابات:' : 'Select a pre-built task pack to import instantly across all accounts:'}
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleImportPresetPack('MATCHDAY')}
                  className="w-full p-3.5 bg-gradient-to-r from-amber-950/50 via-black to-black hover:bg-amber-950/70 border border-amber-500/40 rounded-2xl text-start transition-all flex items-center justify-between group shadow-sm"
                >
                  <div>
                    <p className="text-xs font-black text-[#FFD700] flex items-center gap-1.5">
                      <span>⚽ {t.matchdayPack || 'Matchday Readiness Pack'}</span>
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">3 Tasks</span>
                    </p>
                    <p className="text-[10px] text-white/50 mt-1">
                      {lang === 'ar' ? 'فحص الزي، التوجيه التكتيكي للكرات الثابتة، والتغذية السليمة' : 'Kit readiness, tactical set-piece briefing, & nutrition'}
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-[#FFD700] group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleImportPresetPack('FITNESS')}
                  className="w-full p-3.5 bg-gradient-to-r from-purple-950/50 via-black to-black hover:bg-purple-950/70 border border-purple-500/40 rounded-2xl text-start transition-all flex items-center justify-between group shadow-sm"
                >
                  <div>
                    <p className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                      <span>⚡ {t.fitnessPack || 'Fitness & Conditioning Pack'}</span>
                      <span className="text-[9px] bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded font-mono">2 Tasks</span>
                    </p>
                    <p className="text-[10px] text-white/50 mt-1">
                      {lang === 'ar' ? 'تمارين السرعة والانفجارية، تقوية عضلات الجذع والاستشفاء' : 'Sprint drills, explosive stamina & recovery routine'}
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-purple-300 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleImportPresetPack('TACTICAL')}
                  className="w-full p-3.5 bg-gradient-to-r from-blue-950/50 via-black to-black hover:bg-blue-950/70 border border-blue-500/40 rounded-2xl text-start transition-all flex items-center justify-between group shadow-sm"
                >
                  <div>
                    <p className="text-xs font-black text-blue-300 flex items-center gap-1.5">
                      <span>🎯 {t.tacticsPack || 'Tactical Mastery Pack'}</span>
                      <span className="text-[9px] bg-blue-500/20 text-blue-200 px-1.5 py-0.5 rounded font-mono">2 Tasks</span>
                    </p>
                    <p className="text-[10px] text-white/50 mt-1">
                      {lang === 'ar' ? 'الضغط العالي واستعادة الكرة، والتسديد المباغت والكرات المرتدة' : 'High pressing triggers & rebound shooting drills'}
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-blue-300 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* JSON IMPORT MODAL */}
      <AnimatePresence>
        {showJsonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141414] border border-blue-500/50 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-[0_0_40px_rgba(0,0,0,0.9)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {t.customJsonImport || 'Import Custom JSON Tasks'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowJsonModal(false)}
                  className="p-1.5 text-white/40 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {jsonError && (
                <div className="p-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              <div>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={t.pasteJsonPlaceholder || '[{"title": "Task 1", "category": "MATCHDAY", "priority": "HIGH"}]'}
                  rows={6}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white font-mono placeholder:text-white/25 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJsonModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !jsonInput.trim()}
                  onClick={handleImportJson}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.importJsonBtn || 'Import from JSON'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TASK DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {taskToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#161212] border-2 border-red-500/50 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-[0_0_50px_rgba(239,68,68,0.25)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      {t.deleteTask || (lang === 'ar' ? 'حذف المهمة' : 'Delete Task')}
                    </h3>
                    <span className="text-[10px] text-red-400 font-mono font-bold">
                      {lang === 'ar' ? 'إجراء لا يمكن التراجع عنه' : 'Irreversible Action'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskToDelete(null)}
                  className="p-1.5 text-white/40 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 bg-black/60 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {getPriorityBadge(taskToDelete.priority)}
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-white/10 text-white/70">
                    {taskToDelete.category}
                  </span>
                </div>
                <p className="text-xs font-bold text-white leading-snug">
                  {taskToDelete.title}
                </p>
                {taskToDelete.description && (
                  <p className="text-[11px] text-white/50 line-clamp-2">
                    {taskToDelete.description}
                  </p>
                )}
              </div>

              <p className="text-xs text-white/60 leading-relaxed">
                {t.deleteTaskWarning || (lang === 'ar' 
                  ? 'سيتم حذف هذه المهمة نهائياً من قائمة مهام الفريق ومزامنة الحذف فورياً مع جميع الأجهزة.' 
                  : 'This task will be permanently removed from squad duties and deleted across all devices.')}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setTaskToDelete(null)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl transition-all"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmDeleteTask}
                  className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center gap-2 transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t.confirmDeleteAction || (lang === 'ar' ? 'تأكيد الحذف النهائي' : 'Delete Task')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLEAR ALL COMPLETED TASKS CONFIRMATION MODAL */}
      <AnimatePresence>
        {showClearCompletedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#161212] border-2 border-red-500/50 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-[0_0_50px_rgba(239,68,68,0.25)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      {t.clearCompletedTasks || (lang === 'ar' ? 'مسح المهام المكتملة' : 'Clear Completed Tasks')}
                    </h3>
                    <span className="text-[10px] text-red-400 font-mono font-bold">
                      {completedTasksCount} {lang === 'ar' ? 'مهام منجزة' : 'completed tasks'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClearCompletedModal(false)}
                  className="p-1.5 text-white/40 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-white/70 leading-relaxed">
                {t.clearCompletedConfirm || (lang === 'ar' 
                  ? `هل أنت متأكد من حذف كافة المهام المكتملة (${completedTasksCount} مهمة) دفعة واحدة؟ سيتم إزالتها ومزامنة التغيير عالمياً.` 
                  : `Are you sure you want to delete all ${completedTasksCount} completed tasks at once? They will be permanently removed worldwide.`)}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowClearCompletedModal(false)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl transition-all"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleClearCompletedTasks}
                  className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center gap-2 transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t.clearCompletedTasks || (lang === 'ar' ? 'مسح الكل' : 'Clear All Done')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
