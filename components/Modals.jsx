'use client';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Edit3, ExternalLink, FileText, History, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { DONE, fmtDate, fmtTime, isWarrantyActive, osLabel, qrUrl } from '@/lib/utils';
import { useApp } from './AppContext';
import { Field, Modal, StorageImage, inputCls } from './ui';

const Actions = ({ onCancel, saveLabel }) => (
  <div className="flex justify-end gap-2 pt-2">
    <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-200 rounded-xl font-semibold text-xs">Cancelar</button>
    <button type="submit" className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs">{saveLabel}</button>
  </div>
);

export default function Modals({ modal, setModal }) {
  if (!modal) return null;
  const close = () => setModal(null);
  const props = { modal, setModal, close };
  switch (modal.type) {
    case 'os': return <OsModal {...props} />;
    case 'client': return <ClientModal {...props} />;
    case 'equipment': return <EquipmentModal {...props} />;
    case 'catalog': return <CatalogModal {...props} />;
    case 'profile': return <ProfileModal {...props} />;
    case 'qr': return <QrLabelModal {...props} />;
    case 'passport': return <PassportModal {...props} />;
    case 'laudo': return <LaudoModal {...props} />;
    default: return null;
  }
}

// ---------------------------------------------------------------- O.S.
function OsModal({ modal, close }) {
  const { data, run, getEq, getClient } = useApp();
  const edit = modal.mode === 'edit';
  const d = modal.data || {};
  const techs = data.profiles.filter((p) => p.role === 'tech' && p.active);

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const eq = getEq(f.get('equipment_id'));
    const base = {
      client_id: eq.client_id,
      equipment_id: eq.id,
      tech_id: f.get('tech_id') || null,
      service_type: f.get('service_type'),
      scheduled_date: f.get('scheduled_date'),
      scheduled_time: f.get('scheduled_time'),
      notes: f.get('notes') || ''
    };
    const ok = await run(async () => {
      if (edit) {
        await api.save('work_orders', { id: d.id, ...base });
        if (f.get('status') !== d.status) await api.setOrderStatus(d, f.get('status'));
      } else {
        await api.createWorkOrder({ ...base, status: 'agendada' });
      }
    }, 'O.S. salva');
    if (ok) close();
  };

  return (
    <Modal title={edit ? `Editar ${osLabel(d)}` : 'Nova ordem de serviço'} onClose={close} maxWidth="max-w-lg">
      <form onSubmit={submit} className="p-5 space-y-3 text-xs">
        <Field label="Equipamento (cliente · aparelho · local)">
          <select name="equipment_id" required defaultValue={d.equipment_id || data.equipment[0]?.id} className={inputCls}>
            {data.equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {getClient(eq.client_id)?.name} — {eq.brand} {eq.btus} BTUs ({eq.location_tag})
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de serviço">
            <input name="service_type" required defaultValue={d.service_type || 'Higienização & PMOC'} className={inputCls} />
          </Field>
          <Field label="Técnico designado">
            <select name="tech_id" defaultValue={d.tech_id || techs[0]?.id || ''} className={inputCls}>
              {techs.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </Field>
        </div>
        <div className={`grid gap-3 ${edit ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <Field label="Data">
            <input type="date" name="scheduled_date" required defaultValue={d.scheduled_date || new Date().toLocaleDateString('en-CA')} className={inputCls} />
          </Field>
          <Field label="Horário">
            <input type="time" name="scheduled_time" required defaultValue={(d.scheduled_time || '09:00').slice(0, 5)} className={inputCls} />
          </Field>
          {edit && (
            <Field label="Status">
              <select name="status" defaultValue={d.status} className={inputCls}>
                <option value="agendada">Agendada</option>
                <option value="em_rota">A caminho</option>
                <option value="no_local">No local</option>
                <option value="concluida_rua">Concluída na rua</option>
                <option value="finalizada">Finalizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </Field>
          )}
        </div>
        <Field label="Observações / defeito relatado">
          <textarea name="notes" rows={2} defaultValue={d.notes || ''} className={inputCls} />
        </Field>
        <Actions onCancel={close} saveLabel="Salvar O.S." />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- Cliente
function ClientModal({ modal, close }) {
  const { run } = useApp();
  const edit = modal.mode === 'edit';
  const d = modal.data || {};

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const row = {
      id: edit ? d.id : undefined,
      name: f.get('name'),
      document: f.get('document') || '',
      phone: f.get('phone'),
      address: f.get('address'),
      contact_name: f.get('contact_name') || ''
    };
    const saved = await run(() => api.save('clients', row), 'Cliente salvo');
    if (saved) {
      if (saved !== true) modal.onSaved?.(saved);
      close();
    }
  };

  return (
    <Modal title={edit ? 'Editar cliente' : 'Novo cliente'} onClose={close}>
      <form onSubmit={submit} className="p-5 space-y-3 text-xs">
        <Field label="Nome / razão social"><input name="name" required defaultValue={d.name || ''} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="CPF ou CNPJ"><input name="document" defaultValue={d.document || ''} className={inputCls} /></Field>
          <Field label="WhatsApp (com DDD)"><input name="phone" required defaultValue={d.phone || ''} className={inputCls} /></Field>
        </div>
        <Field label="Endereço completo (usado no GPS)"><input name="address" required defaultValue={d.address || ''} className={inputCls} /></Field>
        <Field label="Pessoa de contato no local"><input name="contact_name" defaultValue={d.contact_name || ''} className={inputCls} /></Field>
        <Actions onCancel={close} saveLabel="Salvar cliente" />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- Equipamento (escritório e técnico)
function EquipmentModal({ modal, setModal, close }) {
  const { data, run, toast } = useApp();
  const edit = modal.mode === 'edit';
  const d = modal.data || {};

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const printQr = f.get('printQr') === 'on';
    const row = {
      id: edit ? d.id : undefined,
      client_id: f.get('client_id'),
      brand: f.get('brand'),
      model: f.get('model'),
      btus: f.get('btus'),
      gas: f.get('gas'),
      voltage: f.get('voltage'),
      serial_number: f.get('serial_number') || '',
      location_tag: f.get('location_tag')
    };
    if (!row.client_id) return toast('Escolha o cliente proprietário.', 'error');

    const saved = await run(async () => {
      const eq = await api.save('equipment', row);
      // Técnico cadastrando a máquina durante uma O.S.: já vincula à O.S.
      if (!edit && modal.bindOsId) await api.patchOrder(modal.bindOsId, { equipment_id: eq.id, client_id: eq.client_id });
      return eq;
    }, 'Equipamento salvo');
    if (!saved) return;
    if (printQr && saved !== true) setModal({ type: 'qr', eq: saved });
    else close();
  };

  return (
    <Modal title={edit ? 'Editar equipamento' : 'Cadastrar equipamento'} onClose={close}>
      <form onSubmit={submit} className="p-5 space-y-3 text-xs">
        {edit && <span className="font-mono text-[11px] bg-slate-900 text-emerald-400 px-2 py-0.5 rounded">{d.code}</span>}
        <Field label="Cliente proprietário">
          <select name="client_id" required defaultValue={d.client_id || data.clients[0]?.id || ''} className={`${inputCls} font-semibold`}>
            {data.clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Marca"><input name="brand" required placeholder="Daikin, LG, Midea" defaultValue={d.brand || ''} className={inputCls} /></Field>
          <Field label="Modelo / linha"><input name="model" required placeholder="Dual Inverter" defaultValue={d.model || ''} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Capacidade (BTUs)"><input name="btus" required defaultValue={d.btus || '12.000'} className={inputCls} /></Field>
          <Field label="Fluido (gás)"><input name="gas" required defaultValue={d.gas || 'R-32'} className={inputCls} /></Field>
          <Field label="Tensão"><input name="voltage" required defaultValue={d.voltage || '220V'} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Local / ambiente instalado"><input name="location_tag" required placeholder="Sala de reunião" defaultValue={d.location_tag || ''} className={inputCls} /></Field>
          <Field label="Número de série"><input name="serial_number" defaultValue={d.serial_number || ''} className={inputCls} /></Field>
        </div>
        <label className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl cursor-pointer">
          <input type="checkbox" name="printQr" defaultChecked={!edit} className="rounded" />
          <span className="text-emerald-950 font-semibold">Abrir a etiqueta QR Code para imprimir após salvar</span>
        </label>
        <Actions onCancel={close} saveLabel="Salvar equipamento" />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- Catálogo
function CatalogModal({ modal, close }) {
  const { run } = useApp();
  const edit = modal.mode === 'edit';
  const d = modal.data || {};

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const ok = await run(
      () => api.save('catalog_items', { id: edit ? d.id : undefined, name: f.get('name'), category: f.get('category'), unit: f.get('unit') }),
      'Item salvo'
    );
    if (ok) close();
  };

  return (
    <Modal title={edit ? 'Editar item do catálogo' : 'Novo item no catálogo'} onClose={close} maxWidth="max-w-sm">
      <form onSubmit={submit} className="p-5 space-y-3 text-xs">
        <Field label="Nome da peça / insumo"><input name="name" required placeholder="Capacitor 35µF" defaultValue={d.name || ''} className={inputCls} /></Field>
        <Field label="Categoria">
          <select name="category" defaultValue={d.category || 'Peça / Componente'} className={inputCls}>
            <option>Peça / Componente</option>
            <option>Fluido Refrigerante</option>
            <option>Material de Instalação</option>
            <option>Químico / Higienização</option>
          </select>
        </Field>
        <Field label="Unidade de apontamento">
          <select name="unit" defaultValue={d.unit || 'un'} className={inputCls}>
            <option value="un">Unidade (un)</option>
            <option value="m">Metros (m)</option>
            <option value="g">Gramas (g)</option>
            <option value="kg">Quilos (kg)</option>
            <option value="par">Par</option>
          </select>
        </Field>
        <Actions onCancel={close} saveLabel="Salvar item" />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- Membro da equipe
function ProfileModal({ modal, close }) {
  const { run, me } = useApp();
  const d = modal.data;
  const self = d.id === me.id;

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const patch = { name: f.get('name'), phone: f.get('phone') || '' };
    if (!self) {
      patch.role = f.get('role');
      patch.active = f.get('active') === 'true';
    }
    const ok = await run(() => api.updateProfile(d.id, patch), 'Usuário atualizado');
    if (ok) close();
  };

  return (
    <Modal title="Editar acesso" onClose={close} maxWidth="max-w-sm">
      <form onSubmit={submit} className="p-5 space-y-3 text-xs">
        <Field label="Nome completo"><input name="name" required defaultValue={d.name} className={inputCls} /></Field>
        <Field label="Telefone / WhatsApp"><input name="phone" defaultValue={d.phone} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Perfil">
            <select name="role" defaultValue={d.role} disabled={self} className={inputCls}>
              <option value="tech">Técnico de rua (celular)</option>
              <option value="admin">Escritório / admin</option>
            </select>
          </Field>
          <Field label="Acesso">
            <select name="active" defaultValue={String(d.active)} disabled={self} className={inputCls}>
              <option value="true">Ativo</option>
              <option value="false">Bloqueado</option>
            </select>
          </Field>
        </div>
        {self && <p className="text-slate-500">Você não pode alterar o seu próprio perfil ou bloquear o seu acesso.</p>}
        <Actions onCancel={close} saveLabel="Salvar" />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- Etiqueta QR
function QrLabelModal({ modal, setModal, close }) {
  const { data, getClient } = useApp();
  const eq = modal.eq;
  const client = getClient(eq.client_id);

  return (
    <Modal title="Etiqueta QR Code" onClose={close} maxWidth="max-w-sm" printArea>
      <div className="p-5 space-y-4 text-center">
        <div className="border-2 border-slate-900 rounded-2xl p-4 space-y-2 bg-white">
          <p className="text-xs font-bold text-slate-900">{data.company?.name}</p>
          <div className="mx-auto w-fit p-2 border border-slate-200 rounded-xl">
            <QRCodeSVG value={qrUrl(eq)} size={160} level="M" />
          </div>
          <p className="font-mono text-sm font-black text-slate-900">{eq.code}</p>
          <p className="text-xs font-bold text-slate-800">{eq.brand} {eq.model} ({eq.btus} BTUs)</p>
          <p className="text-[11px] font-semibold text-slate-600">{client?.name} · {eq.location_tag}</p>
          <p className="text-[10px] text-slate-500">Aponte a câmera para ver o histórico ou chamar o suporte: {data.company?.phone}</p>
        </div>
        <div className="flex flex-col gap-2 no-print">
          <button onClick={() => window.print()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" /> Imprimir etiqueta
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setModal({ type: 'equipment', mode: 'edit', data: eq })} className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1">
              <Edit3 className="w-3.5 h-3.5" /> Editar dados
            </button>
            <button onClick={close} className="py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl">Fechar</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Prontuário do aparelho
function PassportModal({ modal, setModal, close }) {
  const { data, getClient, getEq, getTech } = useApp();
  const [publicView, setPublicView] = useState(!!modal.publicView);
  const eq = getEq(modal.eqId);
  if (!eq) return null;
  const client = getClient(eq.client_id);
  const history = data.orders.filter((o) => o.equipment_id === eq.id && DONE.includes(o.status));
  const warranty = isWarrantyActive(eq.warranty_until);

  return (
    <Modal title={`${eq.brand} ${eq.model} · ${eq.btus} BTUs`} onClose={close} maxWidth="max-w-2xl">
      <div className="p-5 space-y-5">
        <div className="flex flex-wrap gap-2 no-print">
          <button onClick={() => setModal({ type: 'qr', eq })} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
            <Printer className="w-3.5 h-3.5" /> Etiqueta QR
          </button>
          <a href={`/qr/${eq.qr_token}`} target="_blank" rel="noreferrer" className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-300 flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" /> Abrir página pública
          </a>
          <button onClick={() => setPublicView(!publicView)} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-300">
            {publicView ? 'Ver visão técnica' : 'Simular visão do cliente'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block">Cliente / local</span>
            <strong>{client?.name}</strong>
            <p className="text-slate-600">{eq.location_tag}</p>
          </div>
          <div>
            <span className="text-slate-400 block">Especificações</span>
            <strong>Gás {eq.gas} · {eq.voltage}</strong>
            <p className="text-slate-600">Série: {eq.serial_number || '—'} · {eq.code}</p>
          </div>
          <div>
            <span className="text-slate-400 block">Garantia e preventiva</span>
            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded font-bold ${warranty ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
              {warranty ? `Garantia até ${fmtDate(eq.warranty_until)}` : 'Garantia encerrada'}
            </span>
            <p className="text-slate-600 mt-1">Próxima preventiva: <strong>{fmtDate(eq.next_maintenance)}</strong></p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-sky-600" /> Linha do tempo ({history.length})
          </h4>
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-xl">Nenhuma manutenção concluída registrada para este aparelho.</p>
          ) : (
            <div className="space-y-4 border-l-2 border-sky-500 pl-4 ml-2">
              {history.map((os) => (
                <div key={os.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-sky-700">{fmtDate(os.scheduled_date)} · {os.service_type} ({osLabel(os)})</span>
                      {!publicView && <p className="text-[11px] text-slate-500">Técnico: <strong>{getTech(os.tech_id)?.name || '—'}</strong></p>}
                    </div>
                    {!publicView && (
                      <button onClick={() => setModal({ type: 'laudo', osId: os.id })} className="text-xs bg-white border border-slate-300 px-3 py-1 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> Abrir laudo
                      </button>
                    )}
                  </div>
                  {!publicView && <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">{os.notes || 'Sem observações.'}</p>}
                  {os.materials_used.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {os.materials_used.map((m) => (
                        <span key={m.id} className="text-[11px] bg-sky-100 text-sky-900 font-semibold px-2.5 py-1 rounded-lg">{m.quantity} {m.unit} · {m.name}</span>
                      ))}
                    </div>
                  )}
                  {!publicView && (os.photo_before_path || os.photo_after_path) && (
                    <div className="grid grid-cols-2 gap-2">
                      <StorageImage bucket="os-photos" path={os.photo_before_path} alt="Antes" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                      <StorageImage bucket="os-photos" path={os.photo_after_path} alt="Depois" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Laudo técnico (imprimir / salvar PDF)
const CK = { ok: 'CONFORME', attention: 'ATENÇÃO', na: 'N/A', pending: 'PENDENTE' };

function LaudoModal({ modal, close }) {
  const { data, getClient, getEq, getTech } = useApp();
  const os = data.orders.find((o) => o.id === modal.osId);
  if (!os) return null;
  const client = getClient(os.client_id);
  const eq = getEq(os.equipment_id);
  const tech = getTech(os.tech_id);
  const company = data.company;

  return (
    <Modal title={`Laudo ${osLabel(os)}`} onClose={close} maxWidth="max-w-3xl" printArea>
      <div className="p-8 space-y-6 text-xs">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">{company?.name}</h2>
            <p className="text-slate-600">CNPJ: {company?.document || '—'} · Tel: {company?.phone || '—'}</p>
            <p className="text-slate-600">Resp. técnico: {company?.technical_responsible || '—'}</p>
          </div>
          <div className="text-right">
            <span className="bg-slate-900 text-white font-bold px-3 py-1 rounded-lg text-sm">LAUDO TÉCNICO · {osLabel(os)}</span>
            <p className="text-slate-500 mt-1">Data: {fmtDate(os.scheduled_date)}</p>
            {os.arrived_at && <p className="text-slate-500">Chegada {fmtTime(os.arrived_at)} · Saída {fmtTime(os.completed_at) || '—'}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <p className="font-bold text-slate-900 mb-1">Cliente</p>
            <p><strong>Nome:</strong> {client?.name}</p>
            <p><strong>Documento:</strong> {client?.document || '—'}</p>
            <p><strong>Endereço:</strong> {client?.address}</p>
          </div>
          <div>
            <p className="font-bold text-slate-900 mb-1">Equipamento atendido</p>
            <p><strong>Aparelho:</strong> {eq?.brand} {eq?.model} ({eq?.btus} BTUs)</p>
            <p><strong>Ambiente:</strong> {eq?.location_tag} · <strong>Etiqueta:</strong> {eq?.code}</p>
            <p><strong>Gás / tensão:</strong> {eq?.gas} / {eq?.voltage} · <strong>Série:</strong> {eq?.serial_number || '—'}</p>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-2">1. Procedimentos executados — {os.service_type}</h4>
          <div className="grid grid-cols-2 gap-2">
            {os.checklist_items.map((ck) => (
              <div key={ck.id} className="p-2 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                <span>{ck.label}</span>
                <strong>{CK[ck.status]}</strong>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-2">2. Peças, componentes e insumos aplicados</h4>
          {os.materials_used.length === 0 ? (
            <p className="text-slate-500 italic">Nenhum material ou peça substituído nesta intervenção.</p>
          ) : (
            <table className="w-full border border-slate-200">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-2 text-left">Descrição</th>
                  <th className="p-2 text-right">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {os.materials_used.map((m) => (
                  <tr key={m.id}>
                    <td className="p-2">{m.name}</td>
                    <td className="p-2 text-right font-bold">{m.quantity} {m.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-1">3. Parecer técnico e garantia</h4>
          <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 whitespace-pre-wrap">{os.notes || 'Sem observações.'}</p>
          <p className="text-[11px] text-slate-600 mt-1">
            Garantia do serviço: <strong>{company?.warranty_days} dias</strong> · Próxima revisão preventiva recomendada: <strong>{fmtDate(eq?.next_maintenance)}</strong>.
          </p>
        </div>

        {(os.photo_before_path || os.photo_after_path) && (
          <div className="grid grid-cols-2 gap-4">
            {os.photo_before_path && (
              <div>
                <span className="font-bold block mb-1">Registro fotográfico — antes</span>
                <StorageImage bucket="os-photos" path={os.photo_before_path} alt="Antes" className="h-36 w-full object-cover rounded-xl border" />
              </div>
            )}
            {os.photo_after_path && (
              <div>
                <span className="font-bold block mb-1">Registro fotográfico — depois</span>
                <StorageImage bucket="os-photos" path={os.photo_after_path} alt="Depois" className="h-36 w-full object-cover rounded-xl border" />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-center">
          <div>
            <div className="h-14 flex items-center justify-center font-semibold text-slate-700">{tech?.name || '—'}</div>
            <div className="border-t border-slate-400 pt-1">Técnico executor</div>
          </div>
          <div>
            <div className="h-14 flex items-center justify-center">
              {os.signature_path ? (
                <StorageImage bucket="signatures" path={os.signature_path} alt="Assinatura do cliente" className="h-14 mx-auto" />
              ) : (
                <span className="italic text-slate-500">Sem assinatura</span>
              )}
            </div>
            <div className="border-t border-slate-400 pt-1">Aceite do cliente ({os.signature_name || client?.name})</div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 no-print">
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">
            <Printer className="w-4 h-4" /> Imprimir / salvar PDF
          </button>
          <button onClick={close} className="bg-slate-200 text-slate-800 px-5 py-2.5 rounded-xl font-bold">Fechar</button>
        </div>
      </div>
    </Modal>
  );
}
