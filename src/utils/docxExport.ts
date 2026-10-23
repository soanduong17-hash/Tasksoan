import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
} from 'docx';
import { Task, UserProfile } from '../types/task';
import { formatDateVietnamese } from './taskCalculations';

const tableBorderNone = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const tableBorderCell = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
};

/**
 * Exports a task's full report into a professional Microsoft Word (.docx) document
 * formatted with national/organizational standards in Vietnamese.
 */
export async function exportTaskToDocx(task: Task, user?: UserProfile): Promise<Blob> {
  // Build subtask rows
  const subtaskRows = (task.subtasks || []).map((subtask, index) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `${index + 1}`, size: 20 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 62, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: subtask.phase ? `[${subtask.phase}] ${subtask.title}` : subtask.title,
                  bold: subtask.completed,
                  size: 20,
                  strike: false,
                }),
                ...(subtask.resource
                  ? [
                      new TextRun({
                        text: `\n[Tài liệu tham khảo mạng: ${subtask.resource.title} - ${subtask.resource.url}]`,
                        size: 16,
                        italics: true,
                        color: '2563EB',
                      }),
                    ]
                  : []),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: subtask.completed ? '✓ ĐÃ HOÀN THÀNH' : 'ĐANG THỰC HIỆN',
                  bold: true,
                  size: 18,
                  color: subtask.completed ? '16A34A' : 'D97706',
                }),
              ],
            }),
          ],
        }),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header Quốc hiệu / Đơn vị
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorderNone,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: (task.unit || 'ĐƠN VỊ CÔNG TÁC').toUpperCase(),
                            bold: true,
                            size: 20,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'HỆ THỐNG TASKMASTER AI',
                            size: 18,
                            italics: true,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: '-----------------------',
                            size: 16,
                            color: '888888',
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                            bold: true,
                            size: 20,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'Độc lập - Tự do - Hạnh phúc',
                            bold: true,
                            size: 19,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: '***************',
                            size: 16,
                            color: '888888',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: 'BÁO CÁO KẾT QUẢ HOÀN THÀNH NHIỆM VỤ',
                bold: true,
                size: 28,
                color: '1E3A8A',
              }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Mã nhiệm vụ: #${task.id.slice(0, 8).toUpperCase()} • Lưu trữ nghiệm thu`,
                size: 18,
                italics: true,
                color: '64748B',
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // Thông tin cơ bản
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: 'I. THÔNG TIN CHUNG NHIỆM VỤ',
                bold: true,
                size: 22,
                color: '0F172A',
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: '• Tên nhiệm vụ: ', bold: true, size: 20 }),
              new TextRun({ text: task.title, bold: true, size: 20, color: '1D4ED8' }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: '• Đơn vị phụ trách: ', bold: true, size: 20 }),
              new TextRun({ text: task.unit || 'Chưa phân loại', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: '• Mức độ ưu tiên: ', bold: true, size: 20 }),
              new TextRun({
                text:
                  task.priority === 'high'
                    ? 'ƯU TIÊN CAO (KHẨN CẤP)'
                    : task.priority === 'medium'
                    ? 'TRUNG BÌNH'
                    : 'TIÊU CHUẨN',
                bold: true,
                size: 20,
                color: task.priority === 'high' ? 'DC2626' : '334155',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: '• Thời gian bắt đầu khởi tạo: ', bold: true, size: 20 }),
              new TextRun({ text: formatDateVietnamese(task.createdAt), size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: '• Hạn chót hoàn thành theo kế hoạch: ', bold: true, size: 20 }),
              new TextRun({ text: formatDateVietnamese(task.dueDate), size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: '• Thời điểm hoàn thành thực tế: ', bold: true, size: 20 }),
              new TextRun({
                text: task.completedAt ? formatDateVietnamese(task.completedAt) : 'Đã hoàn tất nghiệm thu',
                bold: true,
                size: 20,
                color: '16A34A',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: '• Tiến độ nghiệm thu: ', bold: true, size: 20 }),
              new TextRun({ text: `${task.progress}% - ĐẠT YÊU CẦU LƯU TRỮ CHÍNH THỨC`, bold: true, size: 20, color: '16A34A' }),
            ],
          }),

          new Paragraph({ spacing: { before: 180, after: 80 } }),

          // Mô tả nhiệm vụ
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: 'II. MÔ TẢ NỘI DUNG & MỤC TIÊU CÔNG VIỆC',
                bold: true,
                size: 22,
                color: '0F172A',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 120 },
            children: [
              new TextRun({
                text: task.description || 'Không có mô tả chi tiết.',
                size: 20,
              }),
            ],
          }),

          ...(task.aiAnalysis
            ? [
                new Paragraph({
                  spacing: { before: 60, after: 120 },
                  children: [
                    new TextRun({
                      text: '• Phân tích & nghiên cứu chuyên sâu (AI): ',
                      bold: true,
                      size: 20,
                      color: '4338CA',
                    }),
                    new TextRun({
                      text: task.aiAnalysis,
                      italics: true,
                      size: 19,
                      color: '334155',
                    }),
                  ],
                }),
              ]
            : []),

          // Chi tiết các subtask
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: 'III. DANH SÁCH CÁC HẠNG MỤC CÔNG VIỆC (CHECKLIST)',
                bold: true,
                size: 22,
                color: '0F172A',
              }),
            ],
          }),

          ...(subtaskRows.length > 0
            ? [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 8, type: WidthType.PERCENTAGE },
                          borders: tableBorderCell,
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              children: [new TextRun({ text: 'STT', bold: true, size: 20 })],
                            }),
                          ],
                        }),
                        new TableCell({
                          width: { size: 62, type: WidthType.PERCENTAGE },
                          borders: tableBorderCell,
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: 'Hạng mục nội dung / Tài liệu', bold: true, size: 20 })],
                            }),
                          ],
                        }),
                        new TableCell({
                          width: { size: 30, type: WidthType.PERCENTAGE },
                          borders: tableBorderCell,
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              children: [new TextRun({ text: 'Trạng thái', bold: true, size: 20 })],
                            }),
                          ],
                        }),
                      ],
                    }),
                    ...subtaskRows,
                  ],
                }),
              ]
            : [
                new Paragraph({
                  children: [new TextRun({ text: 'Nhiệm vụ trực tiếp không chia nhỏ hạng mục con.', italics: true, size: 20 })],
                }),
              ]),

          new Paragraph({ spacing: { before: 180, after: 80 } }),

          // Tài liệu & Liên kết
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: 'IV. HỒ SƠ TÀI LIỆU & ĐƯỜNG DẪN LIÊN KẾT',
                bold: true,
                size: 22,
                color: '0F172A',
              }),
            ],
          }),
          ...(task.attachments && task.attachments.length > 0
            ? task.attachments.map(
                (att, i) =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `[Tệp ${i + 1}] ${att.name} (${Math.round(att.size / 1024)} KB, tải lên lúc ${formatDateVietnamese(att.uploadDate)})`,
                        size: 20,
                      }),
                    ],
                  })
              )
            : [
                new Paragraph({
                  children: [new TextRun({ text: 'Không có tệp đính kèm.', size: 20, italics: true })],
                }),
              ]),
          ...(task.links && task.links.length > 0
            ? task.links.map(
                (link, i) =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `[Liên kết ${i + 1}] ${link.title}: `,
                        size: 20,
                        bold: true,
                      }),
                      new TextRun({
                        text: link.url,
                        size: 20,
                        color: '2563EB',
                      }),
                    ],
                  })
              )
            : []),

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // Ký tên xác nhận
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorderNone,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'XÁC NHẬN CỦA ĐƠN VỊ', bold: true, size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 18 }),
                        ],
                      }),
                      new Paragraph({ spacing: { before: 800 } }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: task.unit || 'Lãnh đạo đơn vị', bold: true, size: 20 }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'NGƯỜI THỰC HIỆN BÁO CÁO', bold: true, size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 18 }),
                        ],
                      }),
                      new Paragraph({ spacing: { before: 800 } }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: user?.displayName || 'Cán bộ thực hiện',
                            bold: true,
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Exports a master summary of ALL completed tasks into a single comprehensive DOCX report.
 */
export async function exportAllCompletedTasksToDocx(
  tasks: Task[],
  user?: UserProfile
): Promise<Blob> {
  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.progress === 100);

  const summaryRows = completedTasks.map((t, idx) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `${idx + 1}`, size: 19 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              children: [new TextRun({ text: t.title, bold: true, size: 19 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 24, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              children: [new TextRun({ text: t.unit || 'Chưa phân loại', size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: t.completedAt ? formatDateVietnamese(t.completedAt) : 'Đã nghiệm thu',
                  size: 18,
                  color: '16A34A',
                  bold: true,
                }),
              ],
            }),
          ],
        }),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorderNone,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'CƠ QUAN / ĐƠN VỊ TỔNG HỢP', bold: true, size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'HỆ THỐNG TASKMASTER AI', italics: true, size: 18 }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                            bold: true,
                            size: 20,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, size: 19 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: 'BÁO CÁO TỔNG HỢP CÁC NHIỆM VỤ ĐÃ HOÀN THÀNH',
                bold: true,
                size: 28,
                color: '1E3A8A',
              }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Thời điểm xuất báo cáo: ${formatDateVietnamese(new Date().toISOString())} • Tổng số: ${completedTasks.length} nhiệm vụ`,
                size: 18,
                italics: true,
                color: '64748B',
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // Danh sách bảng tổng hợp
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 6, type: WidthType.PERCENTAGE },
                    borders: tableBorderCell,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'STT', bold: true, size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 40, type: WidthType.PERCENTAGE },
                    borders: tableBorderCell,
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Tên nhiệm vụ đã nghiệm thu', bold: true, size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 24, type: WidthType.PERCENTAGE },
                    borders: tableBorderCell,
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Đơn vị thực hiện', bold: true, size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    borders: tableBorderCell,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'Thời điểm hoàn thành', bold: true, size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
              ...summaryRows,
            ],
          }),

          new Paragraph({ spacing: { before: 300, after: 150 } }),

          // Ký xác nhận
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorderNone,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'ĐẠI DIỆN ĐƠN VỊ QUẢN LÝ', bold: true, size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 18 }),
                        ],
                      }),
                      new Paragraph({ spacing: { before: 800 } }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'NGƯỜI LẬP BÁO CÁO TỔNG HỢP', bold: true, size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 18 }),
                        ],
                      }),
                      new Paragraph({ spacing: { before: 800 } }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: user?.displayName || 'Cán bộ quản lý',
                            bold: true,
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Helper to download single task docx.
 */
export async function downloadTaskDocx(task: Task, user?: UserProfile) {
  const blob = await exportTaskToDocx(task, user);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = (task.title || 'Nhiem_vu')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
    .slice(0, 40);
  a.download = `Bao_cao_Nhiem_vu_${safeTitle}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper to download master report of all completed tasks.
 */
export async function downloadAllCompletedTasksDocx(tasks: Task[], user?: UserProfile) {
  const blob = await exportAllCompletedTasksToDocx(tasks, user);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `Bao_cao_Tong_hop_Nhiem_vu_Hoan_thanh_${dateStr}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
