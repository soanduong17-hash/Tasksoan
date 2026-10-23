import React from 'react';
import { AlertTriangle, Trash2, X, Building2, Calendar } from 'lucide-react';
import { Task } from '../types/task';
import { formatDateVietnamese } from '../utils/taskCalculations';

interface ConfirmDeleteModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (taskId: string) => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  task,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-rose-950">
                Xác Nhận Xóa Nhiệm Vụ
              </h3>
              <p className="text-[11px] text-rose-700 font-medium">Hành động này không thể hoàn tác</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-rose-100 transition-colors cursor-pointer"
            aria-label="Đóng hộp thoại"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs sm:text-sm text-slate-700">
          <p className="leading-relaxed">
            Bạn có chắc chắn muốn xóa nhiệm vụ sau khỏi hệ thống không?
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {task.unit}
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Hạn: {formatDateVietnamese(task.dueDate)}
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-xs text-slate-500 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-3">
              <span>Tiến độ: <strong>{task.progress}%</strong></span>
              <span>•</span>
              <span><strong>{task.subtasks.length}</strong> subtasks</span>
              <span>•</span>
              <span><strong>{task.attachments.length}</strong> tệp đính kèm</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Toàn bộ tiến độ công việc, các ghi chú checklist và tài liệu liên kết của nhiệm vụ này sẽ bị gỡ bỏ hoàn toàn khỏi cơ sở dữ liệu thời gian thực.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-semibold text-xs transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(task.id);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            aria-label="Xác nhận xóa nhiệm vụ này"
          >
            <Trash2 className="w-4 h-4" />
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  );
};
