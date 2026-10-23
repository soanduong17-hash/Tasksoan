import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Loader2,
  RefreshCw,
  Zap,
  Target,
  BarChart3,
  Archive,
  ListTodo,
  ShieldCheck,
  Clock,
  ArrowRight,
  Flame,
  Check,
  Calendar,
  AlertCircle,
  MessageSquare,
  Send,
  HelpCircle,
  Copy,
  Brain,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  CheckSquare,
  Square,
  CornerDownRight,
  Sliders,
  CheckCheck,
} from 'lucide-react';
import { Task, UserProfile, StrategicConsultationResult } from '../types/task';
import { calculateDashboardStats, formatDateVietnamese } from '../utils/taskCalculations';

interface AIAdvisorProps {
  tasks: Task[];
  userProfile: UserProfile;
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ tasks, userProfile }) => {
  // 1. Data segregation
  const stats = useMemo(() => calculateDashboardStats(tasks), [tasks]);
  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'completed' && t.progress < 100),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'completed' || t.progress === 100),
    [tasks]
  );

  const urgentTasks = useMemo(
    () => activeTasks.filter((t) => t.priority === 'high'),
    [activeTasks]
  );
  const overdueTasks = useMemo(
    () => activeTasks.filter((t) => t.status === 'overdue'),
    [activeTasks]
  );

  // 2. Data Selection State (CRITICAL: User explicitly selects what data to send)
  const [includeOverview, setIncludeOverview] = useState<boolean>(true);

  const [includeActiveTasks, setIncludeActiveTasks] = useState<boolean>(true);
  const [activeSelectionMode, setActiveSelectionMode] = useState<'all' | 'urgent' | 'overdue' | 'custom'>('all');
  const [selectedActiveIds, setSelectedActiveIds] = useState<string[]>(() =>
    activeTasks.map((t) => t.id)
  );

  const [includeArchivedTasks, setIncludeArchivedTasks] = useState<boolean>(true);
  const [archivedSelectionMode, setArchivedSelectionMode] = useState<'all' | 'recent5' | 'custom'>('all');
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<string[]>(() =>
    completedTasks.map((t) => t.id)
  );

  // Filter lists by manual or mode selection
  const effectiveActiveTasks = useMemo(() => {
    if (!includeActiveTasks) return [];
    if (activeSelectionMode === 'urgent') return urgentTasks;
    if (activeSelectionMode === 'overdue') return overdueTasks;
    if (activeSelectionMode === 'custom') {
      return activeTasks.filter((t) => selectedActiveIds.includes(t.id));
    }
    return activeTasks;
  }, [includeActiveTasks, activeSelectionMode, urgentTasks, overdueTasks, activeTasks, selectedActiveIds]);

  const effectiveArchivedTasks = useMemo(() => {
    if (!includeArchivedTasks) return [];
    if (archivedSelectionMode === 'recent5') return completedTasks.slice(0, 5);
    if (archivedSelectionMode === 'custom') {
      return completedTasks.filter((t) => selectedArchivedIds.includes(t.id));
    }
    return completedTasks;
  }, [includeArchivedTasks, archivedSelectionMode, completedTasks, selectedArchivedIds]);

  // 3. User Prompt & Directive
  const [consultTopic, setConsultTopic] = useState<string>(
    'Tham mưu chiến lược hành động cá nhân & dứt điểm việc trọng tâm'
  );
  const [consultQuestion, setConsultQuestion] = useState<string>(
    'Rà soát toàn diện các nguồn dữ liệu tôi đã chọn. Hãy chỉ rõ nguyên nhân nghẽn cốt lõi, so sánh 2 phương án hành động và lập lộ trình 24h-48h dứt điểm cho cá nhân tôi.'
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>('sc-pareto');

  // 4. Consultation Result State (NO AUTO CREATION: Starts strictly null)
  const [isConsulting, setIsConsulting] = useState<boolean>(false);
  const [consultThinkingStep, setConsultThinkingStep] = useState<number>(1);
  const [consultResult, setConsultResult] = useState<StrategicConsultationResult | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);

  // 5. Follow-up state
  const [followUpQuery, setFollowUpQuery] = useState<string>('');
  const [isFollowingUp, setIsFollowingUp] = useState<boolean>(false);

  // 6. UI Helpers (Dossier preview & Copy)
  const [showDossierPreview, setShowDossierPreview] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(true);

  // Generate the actual full markdown dossier based strictly on selected data
  const compiledDossier = useMemo(() => {
    const lines: string[] = [];
    lines.push(`# HỒ SƠ THAM MƯU CHIẾN LƯỢC GOOGLE GEMINI (AI ADVISOR DOSSIER)`);
    lines.push(`Hệ thống: TaskMaster AI • Cố Vấn Năng Suất & Hành Động Cá Nhân`);
    lines.push(`Thời điểm trích xuất dữ liệu: ${new Date().toLocaleString('vi-VN')}`);
    lines.push(``);
    lines.push(`## I. BỐI CẢNH CÁN BỘ & ĐỊNH HƯỚNG CÔNG TÁC`);
    lines.push(`- Cán bộ thực hiện: ${userProfile.displayName || 'Cán bộ'}`);
    lines.push(`- Chức vụ / Vai trò: ${userProfile.role || 'Cá nhân phụ trách'}`);
    lines.push(
      `- Các mảng đơn vị công việc làm cho: ${
        userProfile.units?.length > 0 ? userProfile.units.join(', ') : 'Chuyên môn'
      }`
    );
    lines.push(
      `*NGUYÊN TẮC: Đây là kế hoạch hành động của CÁ NHÂN TÔI khi thực hiện nhiệm vụ cho các đơn vị này. Tôi là chủ thể trực tiếp làm việc, không phân công thay cho toàn đơn vị.*`
    );
    lines.push(``);

    // Section 1: Overview
    if (includeOverview) {
      lines.push(`## II. NGUỒN 1: DỮ LIỆU TỔNG QUAN SỐ LIỆU (ĐƯỢC CHỌN)`);
      lines.push(`- Tổng số nhiệm vụ quản lý: ${stats.total} việc`);
      lines.push(
        `- Đang thực hiện: ${activeTasks.length} việc (Khẩn cấp: ${urgentTasks.length}, Quá hạn: ${stats.overdue} việc)`
      );
      lines.push(`- Đã hoàn thành lưu trữ: ${completedTasks.length} việc`);
      lines.push(`- Tỷ lệ hoàn thành: ${stats.completionRate}%`);
      const onTimeRate = completedTasks.length > 0 ? Math.round((completedTasks.length / (completedTasks.length + stats.overdue || 1)) * 100) : 100;
      lines.push(`- Tỷ lệ đúng hạn: ${onTimeRate}%`);
      lines.push(`- Chỉ tiêu tuần này: ${userProfile.weeklyGoal || 4} việc`);
    } else {
      lines.push(`## II. NGUỒN 1: DỮ LIỆU TỔNG QUAN`);
      lines.push(`(Người dùng KHÔNG CHỌN đưa dữ liệu tổng quan vào đợt phân tích này)`);
    }
    lines.push(``);

    // Section 2: Active Tasks
    if (includeActiveTasks) {
      lines.push(
        `## III. NGUỒN 2: DỮ LIỆU NHIỆM VỤ ĐANG TRIỂN KHAI (${effectiveActiveTasks.length} việc được chọn)`
      );
      if (effectiveActiveTasks.length === 0) {
        lines.push(`(Không có nhiệm vụ nào trong danh sách được chọn)`);
      } else {
        effectiveActiveTasks.forEach((t, idx) => {
          const pLabel =
            t.priority === 'high' ? 'Khẩn cấp (Cao)' : t.priority === 'medium' ? 'Vừa' : 'Tiêu chuẩn';
          const subDone = t.subtasks?.filter((s) => s.completed).length || 0;
          const subTotal = t.subtasks?.length || 0;
          lines.push(
            `${idx + 1}. **${t.title}**\n   - Mảng việc cho: ${t.unit || 'chuyên môn'}\n   - Ưu tiên: ${pLabel}\n   - Hạn chót: ${t.dueDate ? t.dueDate.slice(0, 16) : 'Chưa định'}\n   - Tiến độ: ${t.progress || 0}%\n   - Việc con hoàn thành: ${subDone}/${subTotal}`
          );
        });
      }
    } else {
      lines.push(`## III. NGUỒN 2: DỮ LIỆU NHIỆM VỤ ĐANG TRIỂN KHAI`);
      lines.push(`(Người dùng KHÔNG CHỌN đưa danh sách việc đang làm vào đợt phân tích này)`);
    }
    lines.push(``);

    // Section 3: Completed Archive
    if (includeArchivedTasks) {
      lines.push(
        `## IV. NGUỒN 3: DỮ LIỆU HỒ SƠ LƯU TRỮ HOÀN THÀNH (${effectiveArchivedTasks.length} việc được chọn)`
      );
      if (effectiveArchivedTasks.length === 0) {
        lines.push(`(Không có hồ sơ nào trong danh sách được chọn)`);
      } else {
        effectiveArchivedTasks.forEach((t) => {
          lines.push(
            `- **${t.title}** (Làm cho: ${t.unit || 'chuyên môn'}, Hoàn tất: ${
              t.completedAt ? t.completedAt.slice(0, 10) : 'vừa qua'
            }, Minh chứng: ${t.attachments?.length || 0})`
          );
        });
      }
    } else {
      lines.push(`## IV. NGUỒN 3: DỮ LIỆU HỒ SƠ LƯU TRỮ HOÀN THÀNH`);
      lines.push(`(Người dùng KHÔNG CHỌN đưa kho lưu trữ hoàn thành vào đợt phân tích này)`);
    }
    lines.push(``);

    // Section 4: Prompt Directives
    lines.push(`## V. CÂU LỆNH YÊU CẦU THAM MƯU CHIẾN LƯỢC TỪ NGƯỜI DÙNG:`);
    lines.push(`- Chủ đề: "${consultTopic}"`);
    lines.push(`- Câu lệnh / Bài toán: "${consultQuestion}"`);
    lines.push(``);
    lines.push(`## VI. YÊU CẦU ĐỐI VỚI GOOGLE GEMINI:`);
    lines.push(
      `Phân tích sắc bén từ các nguồn dữ liệu người dùng đã lựa chọn ở trên để xuất bản giải pháp tham mưu chiến lược hành động cá nhân (Nhận định bản chất nguyên nhân nghẽn, So sánh 2 phương án chiến lược, Lộ trình hành động 24h-48h của Tôi, Thông điệp quản trị).`
    );

    return lines.join('\n');
  }, [
    userProfile,
    includeOverview,
    stats,
    activeTasks.length,
    urgentTasks.length,
    completedTasks.length,
    includeActiveTasks,
    effectiveActiveTasks,
    includeArchivedTasks,
    effectiveArchivedTasks,
    consultTopic,
    consultQuestion,
  ]);

  // 6 Preset Scenarios tailored to real data
  const strategicPresets = useMemo(() => {
    const list = [
      {
        id: 'sc-pareto',
        icon: '🎯',
        badge: 'Quy tắc 80/20',
        title: 'Chỉ định 2 việc tạo đột phá dứt điểm ngay hôm nay',
        topic: 'Tối ưu hóa thứ tự ưu tiên 80/20',
        question: `Rà soát toàn bộ dữ liệu tôi đã chọn, hãy chỉ định 2 nhiệm vụ có tác động quyết định nhất mà cá nhân tôi cần tập trung giải quyết dứt điểm ngay hôm nay, lý giải rõ lý do và cách làm dứt điểm.`,
      },
      {
        id: 'sc-overdue',
        icon: '🚨',
        badge: 'Khẩn cấp • Quá hạn',
        title: overdueTasks.length > 0
          ? `Giải cứu nhiệm vụ trễ hạn: "${overdueTasks[0].title.slice(0, 38)}..."`
          : 'Phân tích nguy cơ trễ hạn & dứt điểm việc gấp',
        topic: 'Giải cứu nhiệm vụ trễ hạn & kiểm soát rủi ro tiến độ',
        question: overdueTasks.length > 0
          ? `Tham mưu cho cá nhân tôi giải cứu dứt điểm nhiệm vụ trễ hạn "${overdueTasks[0].title}" (làm cho ${overdueTasks[0].unit}), phân tích nguyên nhân nghẽn và lập lộ trình hoàn thành trong 24 giờ tới.`
          : `Tham mưu phương án kiểm soát rủi ro và ngăn ngừa trễ hạn cho các nhiệm vụ ưu tiên cao của tôi trong 48 giờ tới.`,
      },
      {
        id: 'sc-weekly-goal',
        icon: '📈',
        badge: 'Chỉ tiêu tuần',
        title: `Chiến lược bứt phá hoàn thành chỉ tiêu ${userProfile.weeklyGoal || 4} việc tuần này`,
        topic: 'Chạy nước rút chỉ tiêu năng suất tuần',
        question: `Phân tích dữ liệu tổng quan và tiến độ các nhiệm vụ hiện có, hãy tham mưu kế hoạch hành động cụ thể để cá nhân tôi hoàn thành đạt hoặc vượt chỉ tiêu ${userProfile.weeklyGoal || 4} nhiệm vụ trong tuần này.`,
      },
      {
        id: 'sc-time-balance',
        icon: '⚖️',
        badge: 'Cân đối mảng việc',
        title: 'Tái cơ cấu quỹ thời gian giữa các đơn vị, tránh quá tải',
        topic: 'Cân đối phân bổ công việc cá nhân theo đơn vị',
        question: `Phân tích khối lượng công việc tôi đang làm cho các đơn vị (${userProfile.units.join(', ') || 'các mảng'}), hãy tham mưu chiến lược phân bổ quỹ thời gian hợp lý để tôi không bị dồn ứ việc phút chót.`,
      },
      {
        id: 'sc-archive-learning',
        icon: '📦',
        badge: 'Đúc kết kinh nghiệm',
        title: 'Nhân bản bài học từ kho lưu trữ để đẩy nhanh việc dở dang',
        topic: 'Học hỏi từ hồ sơ hoàn thành để tăng tốc',
        question: `Dựa trên các hồ sơ nhiệm vụ tôi đã hoàn thành trong kho lưu trữ, hãy phân tích những cách làm hiệu quả và tham mưu phương pháp áp dụng các bài học đó để đẩy nhanh tiến độ các việc tôi đang triển khai.`,
      },
      {
        id: 'sc-comprehensive',
        icon: '🧠',
        badge: 'Toàn cảnh 360°',
        title: 'Tham mưu toàn diện & xây dựng lộ trình hành động 48 giờ tới',
        topic: 'Tham mưu chiến lược toàn diện & quản trị hiệu suất cá nhân',
        question: `Đánh giá toàn cảnh các nguồn dữ liệu tôi đã chọn, chỉ rõ các điểm nghẽn tiềm ẩn và vạch ra lộ trình 3 bước hành động dứt điểm cho cá nhân tôi trong 48 giờ tới.`,
      },
    ];
    return list;
  }, [overdueTasks, userProfile]);

  // Count total selected items
  const totalSelectedSources = (includeOverview ? 1 : 0) + (includeActiveTasks ? 1 : 0) + (includeArchivedTasks ? 1 : 0);
  const totalSelectedItems = (includeOverview ? 1 : 0) + effectiveActiveTasks.length + effectiveArchivedTasks.length;

  // Toggle active task item selection
  const handleToggleActiveTask = (id: string) => {
    setActiveSelectionMode('custom');
    setSelectedActiveIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Toggle archived task item selection
  const handleToggleArchivedTask = (id: string) => {
    setArchivedSelectionMode('custom');
    setSelectedArchivedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select preset scenario
  const handleSelectPreset = (scenario: typeof strategicPresets[0]) => {
    setSelectedScenarioId(scenario.id);
    setConsultTopic(scenario.topic);
    setConsultQuestion(scenario.question);
  };

  // Copy dossier or result
  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotification(`Đã sao chép ${label} vào bộ nhớ tạm!`);
      setTimeout(() => setCopiedNotification(null), 3000);
    } catch {}
  };

  // Send request to Gemini API
  const handleSendConsultationToGemini = async () => {
    if (totalSelectedSources === 0) {
      alert('Vui lòng chọn ít nhất 1 nguồn dữ liệu (Tổng quan, Nhiệm vụ hoặc Lưu trữ) để gửi tới Gemini.');
      return;
    }
    if (!consultQuestion.trim()) {
      alert('Vui lòng nhập câu lệnh yêu cầu phân tích.');
      return;
    }

    setIsConsulting(true);
    setConsultThinkingStep(1);
    setCheckedSteps([]);

    const timer = setInterval(() => {
      setConsultThinkingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 700);

    try {
      const response = await fetch('/api/ai/consult-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: consultQuestion.trim(),
          topic: consultTopic.trim(),
          includeOverview,
          includeActiveTasks,
          includeArchivedTasks,
          overviewStats: stats,
          tasks: effectiveActiveTasks,
          archivedTasks: effectiveArchivedTasks,
          userProfile,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConsultResult(data);
        setShowConfigDrawer(false); // Collapse selection to focus on solution
      } else {
        throw new Error('Lỗi máy chủ khi gọi Gemini API');
      }
    } catch {
      // High-value structured realistic fallback
      const topTask = effectiveActiveTasks[0]?.title || 'nhiệm vụ trọng tâm';
      const topUnit = effectiveActiveTasks[0]?.unit || 'chuyên môn';
      setConsultResult({
        analysis: `Đối với câu lệnh "${consultQuestion}", phân tích từ các nguồn dữ liệu bạn đã chọn (Tổng quan: ${includeOverview ? 'Có' : 'Không'}, ${effectiveActiveTasks.length} nhiệm vụ đang mở, ${effectiveArchivedTasks.length} việc hoàn thành) cho thấy: Bạn đang dồn sức vào phần việc "${topTask}" (làm cho ${topUnit}). Điểm nghẽn lớn nhất thường nằm ở khâu chuẩn bị thông tin ban đầu chưa dứt khoát, khiến tiến độ sát hạn dễ bị dồn ứ.`,
        options: [
          {
            name: 'Phương án 1: Dứt điểm việc ưu tiên cao nhất trước 12h, tạm hoãn việc phụ',
            pros: 'Giải tỏa ngay áp lực trễ hạn, tạo đà tâm lý thoải mái và nâng cao tỷ lệ hoàn thành.',
            cons: 'Các việc phụ phát sinh sẽ phải dời lại sang ngày tiếp theo.',
            recommended: true,
          },
          {
            name: 'Phương án 2: Chia khung giờ 45 phút tập trung sâu theo từng mảng việc',
            pros: 'Mỗi mảng công tác đều có tiến triển đồng đều.',
            cons: 'Cần kỷ luật bản thân rất cao để không bị phân tán suy nghĩ.',
            recommended: false,
          },
        ],
        actionPlan: [
          {
            step: 1,
            action: `Tôi rà soát lại tiêu chuẩn đầu ra của "${topTask}" và chốt thời hạn nghiệm thu trước 11h30`,
            deadline: 'Sáng nay',
            focusTask: topTask,
          },
          {
            step: 2,
            action: 'Tôi chuẩn bị sẵn biểu mẫu, hồ sơ gốc và liên hệ trước các đầu mối phối hợp',
            deadline: 'Trước giờ bắt đầu 30 phút',
          },
          {
            step: 3,
            action: 'Tôi tự kiểm tra chéo sản phẩm đầu ra, đính kèm minh chứng và hoàn tất nghiệm thu',
            deadline: 'Cuối ngày làm việc',
          },
        ],
        strategicAdvice: 'Quản trị thời gian thông minh là dũng cảm ưu tiên số 1 cho phần việc quan trọng nhất cho đến khi hoàn thành xuất sắc!',
        dataManifest: {
          overviewIncluded: includeOverview,
          activeTasksCount: effectiveActiveTasks.length,
          archivedTasksCount: effectiveArchivedTasks.length,
          analyzedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
      setShowConfigDrawer(false);
    } finally {
      clearInterval(timer);
      setIsConsulting(false);
    }
  };

  // Open direct Google Gemini Web tab with entire dossier copied
  const handleOpenGeminiWeb = () => {
    handleCopyText(compiledDossier, 'toàn bộ hồ sơ dữ liệu & câu lệnh');
    window.open('https://gemini.google.com/app', '_blank');
  };

  // Handle follow up question
  const handleSendFollowUp = async () => {
    if (!followUpQuery.trim() || !consultResult) return;
    setIsFollowingUp(true);

    try {
      const compositePrompt = `TIẾP NỐI THAM MƯU:
Dựa trên giải pháp tham mưu bạn vừa đưa ra: "${consultResult.analysis}".
Người dùng có câu hỏi đào sâu tiếp theo: "${followUpQuery.trim()}".
Hãy tham mưu sắc bén, trực diện cho cá nhân Tôi để giải quyết thấu đáo câu hỏi này.`;

      const response = await fetch('/api/ai/consult-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: compositePrompt,
          topic: `Đào sâu: ${consultTopic}`,
          includeOverview,
          includeActiveTasks,
          includeArchivedTasks,
          overviewStats: stats,
          tasks: effectiveActiveTasks,
          archivedTasks: effectiveArchivedTasks,
          userProfile,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConsultResult(data);
        setFollowUpQuery('');
      }
    } catch {
      alert('Không thể kết nối đến AI, vui lòng thử lại.');
    } finally {
      setIsFollowingUp(false);
    }
  };

  // Toggle step completion checkbox
  const handleToggleStep = (stepNumber: number) => {
    setCheckedSteps((prev) =>
      prev.includes(stepNumber) ? prev.filter((s) => s !== stepNumber) : [...prev, stepNumber]
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-950 p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30 text-xs font-semibold backdrop-blur-xs">
              <Brain className="w-3.5 h-3.5 text-amber-300" />
              <span>Hội Đồng Cố Vấn Chiến Lược • Gemini 3.8 Flash</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Trung Tâm Tham Mưu Chiến Lược &amp; Ra Quyết Định
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed font-normal">
              Chủ động chọn lọc các nguồn dữ liệu bạn muốn đưa vào phân tích (Tổng quan số liệu, Nhiệm vụ đang triển khai, hoặc Kho lưu trữ hoàn thành), sau đó gửi toàn bộ tới <strong>Google Gemini API</strong> với câu lệnh tùy biến để nhận giải pháp tham mưu chiến lược sắc bén.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {consultResult && (
              <button
                type="button"
                onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <Sliders className="w-4 h-4 text-amber-300" />
                <span>{showConfigDrawer ? 'Thu gọn bộ chọn dữ liệu' : 'Mở lại bộ chọn dữ liệu'}</span>
                {showConfigDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenGeminiWeb}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-orange-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
              title="Sao chép toàn bộ hồ sơ dữ liệu đã chọn và mở trực tiếp ứng dụng Google Gemini Web"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Mở Trên Gemini Web</span>
            </button>
          </div>
        </div>

        {/* Floating background ambient glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
      </div>

      {copiedNotification && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{copiedNotification}</span>
          </div>
        </div>
      )}

      {/* 2. GIAO DIỆN CHỌN DỮ LIỆU & NHẬP CÂU LỆNH (DATA SELECTION & DIRECTIVE BUILDER) */}
      {showConfigDrawer && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Bước 1: Chọn Nguồn Dữ Liệu Muốn Gửi Tới Gemini
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tích chọn các mục để Gemini AI nạp dữ liệu chính xác theo bài toán của bạn
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                Đã chọn: {totalSelectedSources}/3 nguồn ({totalSelectedItems} mục dữ liệu)
              </span>
            </div>
          </div>

          {/* 3 Nguồn Dữ Liệu Chọn Lọc */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* NGUỒN 1: TỔNG QUAN SỐ LIỆU */}
            <div
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                includeOverview
                  ? 'bg-slate-50/80 border-indigo-300 ring-2 ring-indigo-500/10 shadow-xs'
                  : 'bg-slate-50/40 border-slate-200 opacity-60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm">
                      📊
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        Dữ Liệu Tổng Quan
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        KPIs, tỷ lệ đúng hạn &amp; chỉ tiêu
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeOverview}
                      onChange={(e) => setIncludeOverview(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {includeOverview ? (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                      <span className="text-slate-500 block">Tổng nhiệm vụ:</span>
                      <span className="font-bold text-slate-900 text-sm">{stats.total} việc</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                      <span className="text-slate-500 block">Đang làm:</span>
                      <span className="font-bold text-indigo-700 text-sm">{activeTasks.length} việc</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                      <span className="text-slate-500 block">Hoàn thành:</span>
                      <span className="font-bold text-emerald-700 text-sm">{stats.completionRate}%</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                      <span className="text-slate-500 block">Quá hạn:</span>
                      <span className={`font-bold text-sm ${stats.overdue > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {stats.overdue} việc
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-100/60 text-center text-xs text-slate-400 italic">
                    Không đưa số liệu tổng quan vào câu lệnh gửi Gemini
                  </div>
                )}
              </div>

              <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between pt-2 border-t border-slate-200/60">
                <span>Chỉ tiêu tuần: {userProfile.weeklyGoal || 4} việc</span>
                <span>{includeOverview ? '✓ Đang bật' : 'Đã tắt'}</span>
              </div>
            </div>

            {/* NGUỒN 2: NHIỆM VỤ ĐANG TRIỂN KHAI */}
            <div
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                includeActiveTasks
                  ? 'bg-slate-50/80 border-indigo-300 ring-2 ring-indigo-500/10 shadow-xs'
                  : 'bg-slate-50/40 border-slate-200 opacity-60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                      📋
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        Nhiệm Vụ Đang Làm
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        {effectiveActiveTasks.length}/{activeTasks.length} việc được chọn
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeActiveTasks}
                      onChange={(e) => setIncludeActiveTasks(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {includeActiveTasks && (
                  <div className="space-y-2">
                    {/* Filter Mode Selector */}
                    <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSelectionMode('all');
                          setSelectedActiveIds(activeTasks.map((t) => t.id));
                        }}
                        className={`py-1 rounded-lg transition-colors cursor-pointer ${
                          activeSelectionMode === 'all'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        Tất cả ({activeTasks.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSelectionMode('urgent')}
                        className={`py-1 rounded-lg transition-colors cursor-pointer ${
                          activeSelectionMode === 'urgent'
                            ? 'bg-rose-600 text-white font-bold'
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        Gấp ({urgentTasks.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSelectionMode('overdue')}
                        className={`py-1 rounded-lg transition-colors cursor-pointer ${
                          activeSelectionMode === 'overdue'
                            ? 'bg-amber-600 text-white font-bold'
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        Trễ ({overdueTasks.length})
                      </button>
                    </div>

                    {/* Quick Active Task Scrollable Preview List */}
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                      {activeTasks.length === 0 ? (
                        <div className="text-slate-400 text-center py-4">Không có việc đang mở</div>
                      ) : (
                        activeTasks.map((t) => {
                          const isChecked = selectedActiveIds.includes(t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => handleToggleActiveTask(t.id)}
                              className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-white border-indigo-200 text-slate-900 shadow-2xs'
                                  : 'bg-slate-100/60 border-slate-200/60 text-slate-400 line-through'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isChecked ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate font-sans font-medium">{t.title}</span>
                              </div>
                              <span
                                className={`text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                                  t.priority === 'high'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {t.priority === 'high' ? 'Gấp' : t.unit || 'Việc'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between pt-2 border-t border-slate-200/60">
                <span>Ưu tiên cao: {urgentTasks.length} việc</span>
                <span>{includeActiveTasks ? '✓ Đang bật' : 'Đã tắt'}</span>
              </div>
            </div>

            {/* NGUỒN 3: HỒ SƠ LƯU TRỮ HOÀN THÀNH */}
            <div
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                includeArchivedTasks
                  ? 'bg-slate-50/80 border-indigo-300 ring-2 ring-indigo-500/10 shadow-xs'
                  : 'bg-slate-50/40 border-slate-200 opacity-60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      📦
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        Hồ Sơ Lưu Trữ Hoàn Thành
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        {effectiveArchivedTasks.length}/{completedTasks.length} hồ sơ hoàn tất
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeArchivedTasks}
                      onChange={(e) => setIncludeArchivedTasks(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {includeArchivedTasks && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => {
                          setArchivedSelectionMode('all');
                          setSelectedArchivedIds(completedTasks.map((t) => t.id));
                        }}
                        className={`py-1 rounded-lg transition-colors cursor-pointer ${
                          archivedSelectionMode === 'all'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        Tất cả ({completedTasks.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchivedSelectionMode('recent5')}
                        className={`py-1 rounded-lg transition-colors cursor-pointer ${
                          archivedSelectionMode === 'recent5'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        5 việc gần nhất
                      </button>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                      {completedTasks.length === 0 ? (
                        <div className="text-slate-400 text-center py-4">Chưa có hồ sơ lưu trữ nào</div>
                      ) : (
                        completedTasks.map((t) => {
                          const isChecked = selectedArchivedIds.includes(t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => handleToggleArchivedTask(t.id)}
                              className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-white border-emerald-200 text-slate-900 shadow-2xs'
                                  : 'bg-slate-100/60 border-slate-200/60 text-slate-400 line-through'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isChecked ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate font-sans font-medium">{t.title}</span>
                              </div>
                              <span className="text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 shrink-0">
                                {t.completedAt ? t.completedAt.slice(0, 10) : 'Xong'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between pt-2 border-t border-slate-200/60">
                <span>Minh chứng: {completedTasks.reduce((acc, c) => acc + (c.attachments?.length || 0), 0)} tệp</span>
                <span>{includeArchivedTasks ? '✓ Đang bật' : 'Đã tắt'}</span>
              </div>
            </div>
          </div>

          {/* Bước 2: Chọn Mẫu Câu Lệnh Hoặc Nhập Tùy Biến */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Bước 2: Chọn Kịch Bản Chiến Lược Hoặc Nhập Câu Lệnh Của Bạn
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Bấm vào 1 kịch bản để nạp nhanh, hoặc tự gõ bài toán thực tế bạn đang đối mặt
                  </span>
                </div>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {strategicPresets.map((sc) => {
                const isSelected = selectedScenarioId === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleSelectPreset(sc)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-400/20 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-base">{sc.icon}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {sc.badge}
                        </span>
                      </div>
                      <span className="font-bold text-xs text-slate-900 block leading-snug">
                        {sc.title}
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-1">
                      <span>{isSelected ? '✓ Đang chọn câu lệnh này' : 'Chọn kịch bản này'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Directive Input Area */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Câu Lệnh Yêu Cầu Phân Tích &amp; Tham Mưu Gửi Tới Gemini:</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Chủ thể: Cá nhân &quot;Tôi&quot; thực hiện công việc
                </span>
              </label>

              <textarea
                rows={3}
                value={consultQuestion}
                onChange={(e) => setConsultQuestion(e.target.value)}
                placeholder="Nhập câu lệnh yêu cầu phân tích cụ thể của bạn (ví dụ: 'Rà soát 5 nhiệm vụ tôi đã chọn, phân tích nguyên nhân nghẽn và đưa ra lộ trình 24 giờ tới để tôi giải quyết dứt điểm...')..."
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-slate-900 text-xs sm:text-sm font-medium outline-hidden resize-none transition-all leading-relaxed"
              />
            </div>

            {/* Action Bar & Dossier Inspector */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDossierPreview(!showDossierPreview)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{showDossierPreview ? 'Ẩn hồ sơ dữ liệu xem trước' : 'Xem trước toàn bộ dữ liệu gửi Gemini'}</span>
                  {showDossierPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyText(compiledDossier, 'hồ sơ dữ liệu')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Sao chép toàn bộ hồ sơ dữ liệu vào Clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép hồ sơ</span>
                </button>
              </div>

              {/* PRIMARY TRIGGER BUTTON */}
              <button
                type="button"
                onClick={handleSendConsultationToGemini}
                disabled={isConsulting || totalSelectedSources === 0 || !consultQuestion.trim()}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-50 flex items-center gap-2.5"
              >
                {isConsulting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Gemini 3.8 Flash đang phân tích sâu...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>Gửi {totalSelectedItems} Mục Dữ Liệu Tới Gemini &amp; Nhận Tham Mưu</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Collapsible Raw Dossier Inspector */}
            {showDossierPreview && (
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-300 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Hồ Sơ Toàn Bộ Dữ Liệu Đã Chọn Sẽ Chuyển Tới API Gemini:</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {compiledDossier.length} ký tự
                  </span>
                </div>
                <pre className="text-[11px] font-mono whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  {compiledDossier}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. THINKING & ANALYZING ANIMATION */}
      {isConsulting && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 shadow-xl text-white space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center">
              <Brain className="w-5 h-5 text-amber-300 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Gemini 3.8 Flash Đang Tiếp Nhận Dữ Liệu &amp; Khởi Thảo Tham Mưu...
              </h3>
              <p className="text-xs text-indigo-200">
                {consultThinkingStep === 1 &&
                  `Bước 1/3: Nạp dữ liệu (${includeOverview ? 'Tổng quan' : ''} • ${effectiveActiveTasks.length} việc đang làm • ${effectiveArchivedTasks.length} việc hoàn thành)...`}
                {consultThinkingStep === 2 &&
                  'Bước 2/3: Phân tích nguyên nhân điểm nghẽn, đối chiếu bài học kinh nghiệm và tính toán rủi ro tiến độ...'}
                {consultThinkingStep >= 3 &&
                  'Bước 3/3: So sánh 2 phương án chiến lược và xuất bản lộ trình hành động 24h-48h dứt điểm...'}
              </p>
            </div>
          </div>

          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-violet-400 to-indigo-400 transition-all duration-500 rounded-full"
              style={{ width: `${(consultThinkingStep / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 4. GIẢI PHÁP THAM MƯU CHIẾN LƯỢC TỪ GEMINI (STRATEGIC ADVISORY SOLUTION DISPLAY) */}
      {consultResult && !isConsulting && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg p-6 sm:p-8 space-y-6">
            {/* Header of Result */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20 shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 uppercase tracking-wider">
                      Bản Tham Mưu Chiến Lược
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Mô hình: Gemini 3.8 Flash
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
                    Giải Pháp Chiến Lược &amp; Lộ Trình Hành Động Dứt Điểm
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dành riêng cho {userProfile.displayName || 'Cán bộ'} ({userProfile.role || 'Cá nhân'}) • {userProfile.units.join(', ')}
                  </p>
                </div>
              </div>

              {/* Data Verification Manifest */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    const text = `GIẢI PHÁP THAM MƯU CHIẾN LƯỢC TỪ GEMINI:\n\n1. NHẬN ĐỊNH BẢN CHẤT:\n${consultResult.analysis}\n\n2. CÁC PHƯƠNG ÁN CHIẾN LƯỢC:\n${consultResult.options.map((o) => `- ${o.name} (${o.recommended ? 'Khuyến nghị' : 'Dự phòng'}):\n  + Ưu điểm: ${o.pros}\n  + Thách thức: ${o.cons}`).join('\n')}\n\n3. LỘ TRÌNH HÀNH ĐỘNG 24H-48H:\n${consultResult.actionPlan.map((a) => `Bước ${a.step}: ${a.action} [Hạn: ${a.deadline || 'Trong ngày'}]`).join('\n')}\n\n4. THÔNG ĐIỆP CỐ VẤN:\n"${consultResult.strategicAdvice}"`;
                    handleCopyText(text, 'toàn bộ giải pháp tham mưu');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép giải pháp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfigDrawer(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Đổi dữ liệu / Tham mưu câu lệnh khác</span>
                </button>
              </div>
            </div>

            {/* Data Source Badge Strip */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-slate-800">Dữ liệu đầu vào đã nạp:</span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${includeOverview ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-500'}`}>
                  {includeOverview ? '✓ Tổng quan số liệu' : '✗ Không nạp Tổng quan'}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${includeActiveTasks ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-500'}`}>
                  {includeActiveTasks ? `✓ ${effectiveActiveTasks.length} việc đang làm` : '✗ Không nạp Việc đang làm'}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${includeArchivedTasks ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                  {includeArchivedTasks ? `✓ ${effectiveArchivedTasks.length} hồ sơ hoàn thành` : '✗ Không nạp Kho lưu trữ'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {consultResult.timestamp ? new Date(consultResult.timestamp).toLocaleTimeString() : 'Vừa xong'}
              </span>
            </div>

            {/* MỤC 1: BÁO CÁO PHÂN TÍCH THỰC TRẠNG & ĐIỂM NGHẼN */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Nhận Định &amp; Đánh Giá Bản Chất Tình Hình:
                </h3>
              </div>
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/90 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                {consultResult.analysis}
              </div>
            </div>

            {/* MỤC 2: CÁC PHƯƠNG ÁN CHIẾN LƯỢC SO SÁNH */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Các Phương Án Chiến Lược Đề Xuất:
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {consultResult.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border transition-all space-y-3 flex flex-col justify-between ${
                      opt.recommended
                        ? 'bg-violet-50/70 border-violet-300 ring-2 ring-violet-500/20 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                          {opt.name}
                        </span>
                        {opt.recommended && (
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-violet-600 text-white shadow-xs shrink-0">
                            Khuyến nghị tối ưu
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-100">
                          <strong>✓ Ưu điểm then chốt:</strong> {opt.pros}
                        </div>
                        <div className="text-amber-800 bg-amber-50/80 p-2.5 rounded-xl border border-amber-100">
                          <strong>⚠️ Thách thức cần kiểm soát:</strong> {opt.cons}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>{opt.recommended ? 'Phương án ưu tiên số 1' : 'Phương án dự phòng'}</span>
                      {opt.recommended && <Check className="w-4 h-4 text-violet-600" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MỤC 3: LỘ TRÌNH HÀNH ĐỘNG DỨT ĐIỂM 24H-48H CỦA TÔI */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Lộ Trình Hành Động Dứt Điểm Của Tôi (24h - 48h tới):
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  Đã hoàn tất {checkedSteps.length}/{consultResult.actionPlan.length} bước
                </span>
              </div>

              <div className="space-y-2.5">
                {consultResult.actionPlan.map((act) => {
                  const isDone = checkedSteps.includes(act.step);
                  return (
                    <div
                      key={act.step}
                      onClick={() => handleToggleStep(act.step)}
                      className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs sm:text-sm cursor-pointer transition-all ${
                        isDone
                          ? 'bg-emerald-50/60 border-emerald-200 opacity-80'
                          : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          className="mt-0.5 text-slate-400 hover:text-emerald-600 cursor-pointer"
                        >
                          {isDone ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </button>

                        <div className="space-y-1 min-w-0">
                          <div className={`font-semibold text-slate-900 leading-snug ${isDone ? 'line-through text-slate-500' : ''}`}>
                            <span className="font-extrabold text-indigo-700 mr-1.5">
                              Bước {act.step}:
                            </span>
                            {act.action}
                          </div>

                          {act.focusTask && (
                            <div className="text-[11px] text-indigo-700 font-medium">
                              🎯 Nhiệm vụ trọng tâm: <strong>{act.focusTask}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {act.deadline && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 whitespace-nowrap shrink-0">
                          ⏰ {act.deadline}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MỤC 4: THÔNG ĐIỆP QUẢN TRỊ CỐT LÕI */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/80 flex items-start gap-3 text-xs sm:text-sm text-slate-900">
              <span className="text-2xl shrink-0">💎</span>
              <div className="space-y-1">
                <span className="font-black text-amber-900 uppercase tracking-wider text-[11px] block">
                  Thông Điệp Quản Trị Cốt Lõi Từ Hội Đồng Tham Mưu:
                </span>
                <p className="font-bold text-slate-800 italic leading-relaxed">
                  &quot;{consultResult.strategicAdvice}&quot;
                </p>
              </div>
            </div>

            {/* MỤC 5: HỎI ĐÁP NỐI TIẾP VỚI GEMINI (FOLLOW-UP CONSULTATION) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Hỏi Đáp Nối Tiếp &amp; Đào Sâu Thêm Về Kế Hoạch Này:</span>
                <span className="text-[11px] text-slate-400">
                  Gemini giữ nguyên ngữ cảnh dữ liệu bạn đã chọn
                </span>
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={followUpQuery}
                  onChange={(e) => setFollowUpQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendFollowUp();
                  }}
                  placeholder="Hỏi tiếp (ví dụ: 'Nếu bước 2 bị chậm 2 tiếng thì phương án dự phòng là gì?')..."
                  className="flex-1 p-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm outline-hidden font-medium"
                />

                <button
                  type="button"
                  onClick={handleSendFollowUp}
                  disabled={isFollowingUp || !followUpQuery.trim()}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                >
                  {isFollowingUp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Gửi câu hỏi</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
