import { Task, UserProfile, ConnectedAppItem } from '../types/task';

export const defaultConnectedApps: ConnectedAppItem[] = [
  {
    id: 'app-gcalendar',
    name: 'Google Calendar',
    url: 'https://calendar.google.com',
    category: 'calendar',
    description: 'Đồng bộ lịch công tác tuần, lịch họp chi bộ và tự động nhắc sự kiện',
    isConnected: true,
    addedAt: '2026-10-01T08:00:00Z',
    iconKey: 'calendar',
  },
  {
    id: 'app-gdrive',
    name: 'Google Drive & Docs',
    url: 'https://drive.google.com',
    category: 'storage',
    description: 'Kho lưu trữ biên bản, nghị quyết, tài liệu minh chứng và hồ sơ nhiệm vụ',
    isConnected: true,
    addedAt: '2026-10-02T09:00:00Z',
    iconKey: 'drive',
  },
  {
    id: 'app-zalo',
    name: 'Zalo Chat & OA',
    url: 'https://chat.zalo.me',
    category: 'communication',
    description: 'Điều phối trực tiếp các nhóm công tác, tiếp nhận phản hồi tức thời',
    isConnected: true,
    addedAt: '2026-10-03T10:00:00Z',
    iconKey: 'zalo',
  },
  {
    id: 'app-telegram',
    name: 'Telegram Messenger',
    url: 'https://web.telegram.org',
    category: 'communication',
    description: 'Kênh nhận thông báo tự động và báo cáo tiến độ khẩn cấp',
    isConnected: true,
    addedAt: '2026-10-04T11:00:00Z',
    iconKey: 'telegram',
  },
  {
    id: 'app-notion',
    name: 'Notion Workspace',
    url: 'https://www.notion.so',
    category: 'document',
    description: 'Cơ sở tri thức nội bộ, ghi chép sổ tay công việc và chiến lược',
    isConnected: false,
    addedAt: '2026-10-05T14:00:00Z',
    iconKey: 'notion',
  },
  {
    id: 'app-trello',
    name: 'Trello Board',
    url: 'https://trello.com',
    category: 'project_management',
    description: 'Bảng Kanban trực quan điều phối công việc liên phòng ban',
    isConnected: false,
    addedAt: '2026-10-06T15:00:00Z',
    iconKey: 'trello',
  },
];

export const initialProfile: UserProfile = {
  displayName: 'Nguyễn Văn An',
  birthDate: '1995-05-18',
  units: ['Ban Thanh Niên', 'Chi hội 1', 'Phòng Kế Hoạch - Chiến Lược', 'CLB Tình Nguyện'],
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  bio: 'Phụ trách công tác điều phối kế hoạch và hoạt động phong trào thanh niên.',
  email: 'tuoitre.vientrihieuhanh.vn@gmail.com',
  phone: '0912 345 678',
  connectedAppsList: defaultConnectedApps,
  connectedApps: {
    googleCalendar: true,
    googleDrive: true,
    zalo: true,
    notion: false,
    telegram: true,
  },
  notifications: {
    browserEnabled: true,
    soundEnabled: true,
    priorityReminders: true,
    overdueAlerts: true,
  },
};


// Current reference date: 2026-10-22
export const initialTasks: Task[] = [
  {
    id: 'task-101',
    title: 'Tổ chức Hội nghị Tổng kết Công tác Quý 3 và Định hướng Quý 4',
    description:
      'Chủ trì tổ chức hội nghị đánh giá toàn diện các chỉ tiêu công tác đã đạt được trong Quý 3, khen thưởng các tập thể xuất sắc và thống nhất kế hoạch trọng tâm Quý 4.',
    unit: 'Ban Thanh Niên',
    priority: 'high',
    createdAt: '2026-10-10T08:30:00Z',
    dueDate: '2026-10-18T17:00:00Z',
    completedAt: '2026-10-18T15:30:00Z',
    progress: 100,
    status: 'completed',
    subtasks: [
      {
        id: 's1',
        title: 'Dự thảo báo cáo tổng kết và xin ý kiến lãnh đạo đơn vị',
        completed: true,
        resource: {
          title: 'Mẫu báo cáo tổng kết công tác đoàn thể',
          url: 'https://docs.google.com/document/u/0/?ftv=1',
          description: 'Khung báo cáo chuẩn theo quý',
        },
      },
      {
        id: 's2',
        title: 'Phát hành giấy mời và chốt danh sách đại biểu tham dự',
        completed: true,
        resource: {
          title: 'Biểu mẫu thư mời họp trang trọng',
          url: 'https://docs.google.com/forms/u/0/',
          description: 'Form đăng ký điểm danh trực tuyến',
        },
      },
      {
        id: 's3',
        title: 'Chuẩn bị hội trường, âm thanh, slide trình chiếu và kỷ yếu',
        completed: true,
      },
      {
        id: 's4',
        title: 'Điều hành hội nghị, ghi biên bản và ban hành nghị quyết',
        completed: true,
      },
    ],
    attachments: [
      {
        id: 'att-1',
        name: 'Bao_cao_Tong_ket_Quy3_Chinh_thuc.pdf',
        size: 1450200,
        type: 'application/pdf',
        uploadDate: '2026-10-18T14:00:00Z',
      },
    ],
    links: [
      {
        id: 'link-1',
        title: 'Thư mục Google Drive ảnh hội nghị',
        url: 'https://drive.google.com',
      },
    ],
    reminder: {
      enabled: true,
      minutesBefore: 60,
    },
  },
  {
    id: 'task-102',
    title: 'Xây dựng Báo cáo Đánh giá Tác động Môi trường & Chuyển đổi Xanh',
    description:
      'Thu thập chỉ số tiêu thụ năng lượng và đề xuất các giải pháp giảm phát thải carbon tại các cơ sở trực thuộc theo chỉ đạo mới.',
    unit: 'Phòng Kế Hoạch - Chiến Lược',
    priority: 'high',
    createdAt: '2026-10-12T09:00:00Z',
    dueDate: '2026-10-20T17:00:00Z', // Past due (overdue)
    progress: 33,
    status: 'overdue',
    subtasks: [
      {
        id: 's201',
        title: 'Khảo sát hiện trạng sử dụng điện, nước và rác thải tại 4 cơ sở',
        completed: true,
        resource: {
          title: 'Quy chuẩn kiểm kê khí nhà kính ISO 14064',
          url: 'https://vi.wikipedia.org/wiki/ISO_14064',
          description: 'Tiêu chuẩn quốc tế về đo lường phát thải carbon',
        },
      },
      {
        id: 's202',
        title: 'Tổng hợp số liệu vào mô hình tính toán chi phí - lợi ích',
        completed: false,
        resource: {
          title: 'Công cụ tính toán năng lượng xanh của Bộ TN&MT',
          url: 'https://monre.gov.vn',
          description: 'Cổng thông tin hướng dẫn chuyển đổi số xanh',
        },
      },
      {
        id: 's203',
        title: 'Hoàn thiện bản thuyết minh chiến lược và nộp cấp trên thẩm định',
        completed: false,
      },
    ],
    attachments: [
      {
        id: 'att-2',
        name: 'So_lieu_khao_sat_nang_luong_2026.xlsx',
        size: 890400,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadDate: '2026-10-15T11:20:00Z',
      },
    ],
    links: [
      {
        id: 'link-2',
        title: 'Bảng theo dõi số liệu trực tuyến',
        url: 'https://docs.google.com/spreadsheets/u/0/',
      },
    ],
    reminder: {
      enabled: true,
      minutesBefore: 1440,
    },
  },
  {
    id: 'task-103',
    title: 'Biên soạn Bộ Cẩm nang Số hóa Sinh hoạt Chi đoàn & Sinh hoạt Đơn vị',
    description:
      'Biên soạn tài liệu số hóa quy trình sinh hoạt đoàn, điểm danh mã QR, biểu quyết trực tuyến và kho học liệu văn hóa ứng xử.',
    unit: 'Chi hội 1',
    priority: 'medium',
    createdAt: '2026-10-18T10:00:00Z',
    dueDate: '2026-10-26T18:00:00Z', // Upcoming
    progress: 67,
    status: 'in_progress',
    subtasks: [
      {
        id: 's301',
        title: 'Lấy ý kiến khảo sát nhu cầu từ các bạn đoàn viên cơ sở',
        completed: true,
        resource: {
          title: 'Cẩm nang chuyển đổi số thanh niên',
          url: 'https://doanthanhnien.vn',
          description: 'Tài liệu hướng dẫn nghiệp vụ thanh niên',
        },
      },
      {
        id: 's302',
        title: 'Thiết kế đồ họa infographic các bước sử dụng ứng dụng di động',
        completed: true,
        resource: {
          title: 'Mẫu thiết kế infographic Canva',
          url: 'https://www.canva.com',
          description: 'Bộ mẫu thiết kế trực quan',
        },
      },
      {
        id: 's303',
        title: 'In thử nghiệm 50 cuốn và phát hành phiên bản Ebook PDF',
        completed: false,
      },
    ],
    attachments: [],
    links: [
      {
        id: 'link-3',
        title: 'Bản thảo Google Docs Cẩm nang',
        url: 'https://docs.google.com/document/u/0/',
      },
    ],
    reminder: {
      enabled: true,
      minutesBefore: 60,
    },
  },
  {
    id: 'task-104',
    title: 'Chiến dịch Ngày Chủ Nhật Xanh - Thu gom và Tái chế Rác thải Nhựa',
    description:
      'Tập hợp tình nguyện viên phát quang đường phố, đặt thùng phân loại rác tái chế và đổi chai nhựa lấy cây sen đá.',
    unit: 'CLB Tình Nguyện',
    priority: 'low',
    createdAt: '2026-10-21T07:30:00Z',
    dueDate: '2026-10-28T12:00:00Z',
    progress: 25,
    status: 'in_progress',
    subtasks: [
      {
        id: 's401',
        title: 'Đăng bài truyền thông kêu gọi 30 tình nguyện viên tham gia',
        completed: true,
        resource: {
          title: 'Nhóm tình nguyện cộng đồng (Zalo / Facebook)',
          url: 'https://zalo.me',
          description: 'Kênh truyền thông nội bộ',
        },
      },
      {
        id: 's402',
        title: 'Liên hệ đơn vị tài trợ xin 100 cây xanh và túi phân hủy sinh học',
        completed: false,
      },
      {
        id: 's403',
        title: 'Phân luồng khu vực thu gom và chuẩn bị dụng cụ bảo hộ',
        completed: false,
      },
      {
        id: 's404',
        title: 'Thực hiện ngày ra quân và bàn giao rác cho nhà máy tái chế',
        completed: false,
      },
    ],
    attachments: [],
    links: [],
    reminder: {
      enabled: true,
      minutesBefore: 30,
    },
  },
];
