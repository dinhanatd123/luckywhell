import { EventWorkspace, Participant, Prize } from '../types/luckyWheel';

export const SAMPLE_PARTICIPANT_NAMES = [
  'Nguyễn Minh Anh',
  'Trần Hoàng Bảo',
  'Lê Thị Thu Hà',
  'Phạm Quốc Khánh',
  'Vũ Ngọc Linh',
  'Đặng Tuấn Kiệt',
  'Bùi Phương Thảo',
  'Hoàng Gia Huy',
  'Ngô Thanh Tâm',
  'Đỗ Đức Mạnh',
  'Phan Bảo Ngọc',
  'Lý Quang Vinh',
];

export function createSampleParticipants(): Participant[] {
  return SAMPLE_PARTICIPANT_NAMES.map((name, idx) => ({
    id: `p_sample_${idx + 1}`,
    name,
    active: true,
    order: idx,
  }));
}

export function createSamplePrizes(): Prize[] {
  return [
    {
      id: 'prize_special',
      name: 'Giải Đặc Biệt',
      reward: '10.000.000 VNĐ',
      totalQuantity: 1,
      remainingQuantity: 1,
      order: 0,
    },
    {
      id: 'prize_first',
      name: 'Giải Nhất',
      reward: 'Tai nghe AirPods Pro',
      totalQuantity: 1,
      remainingQuantity: 1,
      order: 1,
    },
    {
      id: 'prize_second',
      name: 'Giải Nhì',
      reward: '2.000.000 VNĐ',
      totalQuantity: 2,
      remainingQuantity: 2,
      order: 2,
    },
    {
      id: 'prize_third',
      name: 'Giải Ba',
      reward: '500.000 VNĐ',
      totalQuantity: 3,
      remainingQuantity: 3,
      order: 3,
    },
  ];
}

export function createDefaultWorkspace(id = 'default_local'): EventWorkspace {
  const prizes = createSamplePrizes();
  return {
    id,
    title: 'Vòng Quay May Mắn — Gala Trao Thưởng 2026',
    theme: 'cyber',
    spinDuration: 6,
    autoRemoveWinner: true,
    selectedPrizeId: prizes[prizes.length - 1].id, // Start at Giải Ba so MC builds excitement upward
    participants: createSampleParticipants(),
    prizes,
    winners: [],
    updatedAt: new Date().toISOString(),
  };
}
