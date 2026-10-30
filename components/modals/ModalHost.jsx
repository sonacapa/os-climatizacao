'use client';
import AccountModal from './AccountModal';
import CatalogModal from './CatalogModal';
import ClientModal from './ClientModal';
import EquipmentModal from './EquipmentModal';
import LaudoModal from './LaudoModal';
import MemberModal from './MemberModal';
import OsDetailModal from './OsDetailModal';
import OsFormModal from './OsFormModal';
import PassportModal from './PassportModal';
import RescheduleModal from './RescheduleModal';
import QrLabelsModal from './QrLabelsModal';
import ShareLaudosModal from './ShareLaudosModal';
import RouteModal from '../field/RouteModal';
import ScanResultModal from '../field/ScanResultModal';

const MAP = {
  account: AccountModal,
  catalog: CatalogModal,
  client: ClientModal,
  equipment: EquipmentModal,
  laudo: LaudoModal,
  member: MemberModal,
  osDetail: OsDetailModal,
  os: OsFormModal,
  passport: PassportModal,
  qrLabels: QrLabelsModal,
  reschedule: RescheduleModal,
  shareLaudos: ShareLaudosModal,
  route: RouteModal,
  scanResult: ScanResultModal
};

export default function ModalHost({ modals }) {
  return modals.map((m) => {
    const C = MAP[m.type];
    return C ? <C key={m.key} {...m.props} /> : null;
  });
}
