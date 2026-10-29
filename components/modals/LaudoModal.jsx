'use client';
import { useEffect, useState } from 'react';
import { Copy, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { laudoUrl, logoUrl, waLink } from '@/lib/utils';
import { useApp } from '../AppContext';
import LaudoView from '../Laudo';
import { Btn, Modal } from '../ui';
import { eqTitle } from '../shared';

export function laudoMessage(company, client, eq, item) {
  return `Olá, ${client.name.split(' ')[0]}! Segue o laudo do serviço no aparelho ${eqTitle(eq)} (${eq.location_tag || eq.code}), realizado por ${company.name}:\n${laudoUrl(item)}`;
}

export function useLaudoData(osId, itemId) {
  const { data, getClient, getEq, getTech } = useApp();
  const os = data.orders.find((o) => o.id === osId);
  const item = os?.items.find((i) => i.id === itemId);
  const [photos, setPhotos] = useState({ before: null, after: null, signature: null });
  useEffect(() => {
    if (!os || !item) return undefined;
    let alive = true;
    Promise.all([
      api.createSignedUrl('os-photos', item.photo_before_path),
      api.createSignedUrl('os-photos', item.photo_after_path),
      api.createSignedUrl('signatures', os.signature_path)
    ]).then(([before, after, signature]) => alive && setPhotos({ before, after, signature }));
    return () => { alive = false; };
  }, [os?.id, item?.photo_before_path, item?.photo_after_path, os?.signature_path]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!os || !item) return { os, item, d: null };
  const client = getClient(os.client_id);
  const eq = getEq(item.equipment_id);
  if (!client || !eq) return { os, item, d: null };
  return {
    os, item, client, eq,
    d: {
      company: { ...data.company, logo_url: logoUrl(data.company?.logo_path) },
      client, tech: getTech(os.tech_id)?.name || '',
      os: { number: os.number, date: os.scheduled_date, service_type: item.service_type || os.service_type, signature_name: os.signature_name },
      item, equipment: eq, checklist: item.checklist, materials: item.materials, photos
    }
  };
}

export default function LaudoModal({ osId, itemId }) {
  const { closeModal, data, toast } = useApp();
  const { d, item, client, eq } = useLaudoData(osId, itemId);
  if (!d) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(laudoUrl(item));
      toast('Link do laudo copiado');
    } catch {
      toast('Não foi possível copiar. Use o botão do WhatsApp.', 'error');
    }
  };

  return (
    <Modal
      title="Laudo técnico"
      subtitle={`${eq.code} · ${client.name}`}
      maxWidth="max-w-3xl"
      printArea
      onClose={closeModal}
      footer={
        <div className="flex flex-wrap gap-2 justify-end">
          <Btn variant="secondary" icon={Copy} onClick={copy}>Copiar link</Btn>
          <Btn variant="whatsapp" onClick={() => window.open(waLink(client.phone, laudoMessage(data.company, client, eq, item)), '_blank')}>Enviar por WhatsApp</Btn>
          <Btn icon={Printer} onClick={() => window.print()}>Imprimir / PDF</Btn>
        </div>
      }
    >
      <LaudoView d={d} />
    </Modal>
  );
}
