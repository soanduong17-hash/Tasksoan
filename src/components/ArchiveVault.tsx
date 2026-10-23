import React, { useState } from 'react';
import {
  Archive,
  Download,
  FileText,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Building2,
  Calendar,
  Search,
  ExternalLink,
  Paperclip,
  Clock,
  Sparkles,
  Eye,
  X,
  FileCheck2,
  Check
} from 'lucide-react';
import { Task, UserProfile } from '../types/task';
import { formatDateVietnamese } from '../utils/taskCalculations';
import { downloadTaskDocx, downloadAllCompletedTasksDocx } from '../utils/docxExport';

interface ArchiveVaultProps {
  completedTasks: Task[];
  userProfile: UserProfile;
  onRestoreTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenCreateModal: () => void;
}

export const ArchiveVault: React.FC<ArchiveVaultProps> = ({
  completedTasks,
  userProfile,
  onRestoreTask,
  onDeleteTask,
  onOpenCreateModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const filteredTasks = completedTasks.filter((task) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(q) ||
      task.description.toLowerCase().includes(q) ||
      task.unit.toLowerCase().includes(q)
    );
  });

  const handleDownloadWord = async (task: Task) => {
    try {
      setDownloadingId(task.id);
      await downloadTaskDocx(task, userProfile);
      setSuccessToast(`Đã tải xuống file DOCX báo cáo nhiệm vụ "${task.title}"!`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (error) {
      console.error('Error exporting docx:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAllMasterWord = async () => {
    if (completedTasks.length === 0) return;
    try {
      setIsDownloadingAll(true);
      await downloadAllCompletedTasksDocx(completedTasks, userProfile);
      setSuccessToast(`Đã tải xuống file DOCX tổng hợp ${completedTasks.length} nhiệm vụ đã hoàn thành!`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (error) {
      console.error('Error exporting master docx:', error);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {successToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <FileCheck2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Vault Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-semibold backdrop-blur-xs">
            <Archive className="w-3.5 h-3.5 text-emerald-300" />
            Kho Lưu Trữ &amp; Xuất Bản Báo Cáo DOCX
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Lưu Trữ Nhiệm Vụ &amp; Xuất File Word (.docx)
          </h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
            Hệ thống tự động lưu trữ các nhiệm vụ đã hoàn thành 100% và cho phép xuất toàn bộ nội dung công việc, checklist, liên kết và biên bản xác nhận ra file Microsoft Word (.docx) chuyên nghiệp bằng thư viện docx.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleDownloadAllMasterWord}
            disabled={completedTasks.length === 0 || isDownloadingAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold backdrop-blur-md transition-all cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95"
            title="Xuất file DOCX tổng hợp toàn bộ các nhiệm vụ đã hoàn thành"
          >
            <FileText className="w-4 h-4 text-emerald-300" />
            <span>{isDownloadingAll ? 'Đang tạo tổng hợp...' : 'Xuất Báo Cáo Tổng Hợp DOCX'}</span>
            <Download className="w-3.5 h-3.5" />
          </button>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-2.5 text-center">
            <span className="block text-2xl font-black text-emerald-300">{completedTasks.length}</span>
            <span className="text-[11px] font-medium text-emerald-100">Đã nghiệm thu</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm nhiệm vụ đã lưu trữ theo tên, nội dung hoặc đơn vị..."
          className="flex-1 text-xs sm:text-sm outline-hidden text-slate-800 placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Xóa tìm
          </button>
        )}
      </div>

      {/* Archived Task Cards */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Archive className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Chưa có nhiệm vụ nào trong kho lưu trữ</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Khi bạn hoàn thành 100% các subtask hoặc nhấn &quot;Hoàn thành &amp; Lưu trữ&quot;, nhiệm vụ sẽ được chuyển vào đây để lưu trữ và tải file DOCX.
            </p>
          </div>
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Tạo nhiệm vụ mới
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-3xl border border-emerald-100 hover:border-emerald-300 p-5 sm:p-6 transition-all shadow-xs hover:shadow-md space-y-4"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ĐÃ HOÀN THÀNH 100%
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold" title={`Phân loại nhiệm vụ cá nhân tôi làm cho ${task.unit}`}>
                    <Building2 className="w-3 h-3 text-slate-500" />
                    Làm cho: {task.unit}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Hoàn tất:{' '}
                    <strong className="text-slate-700">
                      {task.completedAt ? formatDateVietnamese(task.completedAt) : 'Đã nghiệm thu'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">{task.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  {task.description || 'Không có mô tả chi tiết.'}
                </p>
              </div>

              {/* Subtasks summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 text-xs space-y-1.5">
                <span className="font-bold text-slate-700 block mb-1">
                  Checklist đã nghiệm thu ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {task.subtasks.map((st, i) => (
                    <div key={st.id} className="flex items-center gap-1.5 text-slate-600">
                      <span className="text-emerald-600 font-bold shrink-0">✓</span>
                      {st.phase && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200/80 text-slate-700 shrink-0">
                          {st.phase}
                        </span>
                      )}
                      <span className="line-clamp-1">
                        {i + 1}. {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons: TẢI FILE DOCX NỔI BẬT */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Mã hồ sơ: #{task.id.slice(0, 8).toUpperCase()}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Xem trước mẫu báo cáo */}
                  <button
                    type="button"
                    onClick={() => setPreviewTask(task)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    title="Xem trước nội dung báo cáo Word"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Xem trước
                  </button>

                  {/* Khôi phục lại */}
                  <button
                    type="button"
                    onClick={() => onRestoreTask(task)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    title="Chuyển lại về danh sách nhiệm vụ đang làm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Khôi phục
                  </button>

                  {/* Xóa */}
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Xóa khỏi lưu trữ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* NÚT TẢI DOCX (WORD) CHÍNH YÊU CẦU */}
                  <button
                    type="button"
                    onClick={() => handleDownloadWord(task)}
                    disabled={downloadingId === task.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 text-blue-200" />
                    <span>
                      {downloadingId === task.id ? 'Đang tạo DOCX...' : 'Tải về file DOCX (Word)'}
                    </span>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal for DOCX Report */}
      {previewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm sm:text-base">Xem Trước Cấu Trúc Báo Cáo DOCX</h3>
              </div>
              <button
                onClick={() => setPreviewTask(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                aria-label="Đóng xem trước"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content simulating Word document format */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs sm:text-sm bg-slate-50/50">
              {/* Document Mockup Box */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                {/* Header standard */}
                <div className="grid grid-cols-2 text-center text-[11px] pb-4 border-b border-slate-200">
                  <div>
                    <span className="font-bold uppercase block">{previewTask.unit}</span>
                    <span className="italic text-slate-500">HỆ THỐNG TASKMASTER AI</span>
                  </div>
                  <div>
                    <span className="font-bold uppercase block">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span>
                    <span className="font-semibold block">Độc lập - Tự do - Hạnh phúc</span>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <h2 className="text-base sm:text-lg font-black text-blue-900 uppercase">
                    BÁO CÁO KẾT QUẢ HOÀN THÀNH NHIỆM VỤ
                  </h2>
                  <p className="text-xs text-slate-500 italic">Mã số: #{previewTask.id.slice(0, 8).toUpperCase()}</p>
                </div>

                {/* Section I */}
                <div className="space-y-1.5 text-xs">
                  <h4 className="font-bold text-slate-900 uppercase border-b pb-1">I. Thông tin chung</h4>
                  <p><strong>Tên nhiệm vụ:</strong> {previewTask.title}</p>
                  <p><strong>Đơn vị thực hiện:</strong> {previewTask.unit}</p>
                  <p><strong>Thời gian khởi tạo:</strong> {formatDateVietnamese(previewTask.createdAt)}</p>
                  <p><strong>Hạn chót kế hoạch:</strong> {formatDateVietnamese(previewTask.dueDate)}</p>
                  <p><strong>Hoàn thành thực tế:</strong> {previewTask.completedAt ? formatDateVietnamese(previewTask.completedAt) : 'Đã nghiệm thu'}</p>
                  <p><strong>Tiến độ:</strong> 100% (Đạt tiêu chuẩn nghiệm thu)</p>
                </div>

                {/* Section II */}
                <div className="space-y-1.5 text-xs">
                  <h4 className="font-bold text-slate-900 uppercase border-b pb-1">II. Mô tả công việc</h4>
                  <p className="text-slate-600 leading-relaxed">{previewTask.description || 'Không có mô tả chi tiết.'}</p>
                </div>

                {/* Section III */}
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 uppercase border-b pb-1">III. Danh sách hạng mục đã hoàn thành</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-[11px] font-bold">
                        <tr>
                          <th className="p-2 border-b border-r text-center w-10">STT</th>
                          <th className="p-2 border-b border-r">Nội dung công việc &amp; Tài liệu mạng</th>
                          <th className="p-2 border-b text-center w-28">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {previewTask.subtasks.map((st, i) => (
                          <tr key={st.id}>
                            <td className="p-2 text-center border-r font-medium">{i + 1}</td>
                            <td className="p-2 border-r">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {st.phase && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {st.phase}
                                  </span>
                                )}
                                <span className="font-semibold">{st.title}</span>
                              </div>
                              {st.resource && (
                                <span className="text-[10px] text-blue-600 italic block mt-0.5">
                                  [{st.resource.title} - {st.resource.url}]
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-center text-emerald-700 font-bold">
                              ✓ ĐÃ HOÀN THÀNH
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signature Block */}
                <div className="grid grid-cols-2 text-center text-xs pt-4 border-t border-slate-200">
                  <div>
                    <span className="font-bold uppercase block">XÁC NHẬN CỦA ĐƠN VỊ</span>
                    <span className="italic text-slate-400 text-[10px] block mb-12">(Ký, ghi rõ họ tên)</span>
                    <span className="font-bold">{previewTask.unit}</span>
                  </div>
                  <div>
                    <span className="font-bold uppercase block">NGƯỜI THỰC HIỆN BÁO CÁO</span>
                    <span className="italic text-slate-400 text-[10px] block mb-12">(Ký, ghi rõ họ tên)</span>
                    <span className="font-bold">{userProfile.displayName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Xuất trực tiếp bằng thư viện docx chuẩn Microsoft Word
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTask(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadWord(previewTask);
                    setPreviewTask(null);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:scale-105 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Tải file DOCX này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
