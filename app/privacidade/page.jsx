export const metadata = { title: 'Política de privacidade' };

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-semibold text-ink">{title}</h2>
    <div className="space-y-2 text-slate-700 leading-relaxed">{children}</div>
  </section>
);

export default function Privacidade() {
  return (
    <main className="min-h-screen bg-paper py-8">
      <article className="max-w-2xl mx-auto px-4 space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-ink">Política de privacidade</h1>
          <p className="text-sm text-slate-500 mt-1">Atualizada em 29/10/2026</p>
        </header>

        <Section title="Quem cuida dos seus dados">
          <p>
            Os dados tratados neste sistema são de responsabilidade da empresa de climatização que prestou ou presta o serviço a você
            (a “empresa”), cujo nome e contato aparecem no laudo e na etiqueta do equipamento. O sistema é a ferramenta que a empresa usa
            para registrar ordens de serviço, aparelhos e laudos.
          </p>
        </Section>

        <Section title="Quais dados são tratados">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Clientes:</strong> nome, endereço, telefone e, quando informado, e-mail e documento.</li>
            <li><strong>Aparelhos:</strong> marca, modelo, local de instalação, histórico de manutenções, garantias e fotos do equipamento.</li>
            <li><strong>Atendimentos:</strong> data, serviço realizado, materiais usados, observações do técnico, fotos de antes e depois e assinatura de quem recebeu o serviço.</li>
            <li><strong>Equipe:</strong> nome, e-mail e telefone de quem tem acesso ao sistema.</li>
          </ul>
        </Section>

        <Section title="Para que usamos">
          <ul className="list-disc pl-5 space-y-1">
            <li>Executar e registrar o serviço contratado e emitir o laudo técnico.</li>
            <li>Controlar garantias e avisar quando a próxima manutenção preventiva estiver próxima.</li>
            <li>Entrar em contato sobre agendamentos, laudos e manutenções do seu equipamento.</li>
            <li>Cumprir obrigações legais e proteger a empresa em caso de dúvida sobre um serviço.</li>
          </ul>
        </Section>

        <Section title="Com quem os dados são compartilhados">
          <p>
            Os dados não são vendidos. Ficam guardados em provedores de tecnologia contratados pela empresa para hospedar o sistema
            (banco de dados, armazenamento de arquivos e hospedagem do site), que podem manter servidores fora do Brasil. Quando a
            empresa envia um laudo por WhatsApp, o link é entregue por esse aplicativo, sob as regras dele.
          </p>
          <p>
            O QR Code colado no aparelho abre uma página com a identificação do equipamento e o histórico de serviços. Ela não mostra
            seu telefone nem seu endereço, mas qualquer pessoa que leia o QR consegue ver esse histórico.
          </p>
        </Section>

        <Section title="Por quanto tempo guardamos">
          <p>
            Pelo tempo em que o aparelho for atendido pela empresa e pelo prazo necessário para garantia, obrigações legais e defesa em
            processos. Depois disso, os dados são apagados ou anonimizados.
          </p>
        </Section>

        <Section title="Seus direitos">
          <p>Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode pedir à empresa:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>confirmar se tratamos seus dados e ter acesso a eles;</li>
            <li>corrigir dados incompletos ou desatualizados;</li>
            <li>pedir a eliminação de dados desnecessários ou tratados sem base legal;</li>
            <li>receber seus dados em formato que você possa levar a outro fornecedor;</li>
            <li>retirar um consentimento que tenha dado, por exemplo para receber avisos de manutenção.</li>
          </ul>
          <p>Para isso, fale com a empresa pelo telefone ou e-mail que aparecem no laudo.</p>
        </Section>

        <Section title="Como protegemos">
          <p>
            O acesso ao sistema exige login e senha, cada pessoa vê só o que o seu perfil permite, a comunicação é criptografada
            (HTTPS) e fotos e assinaturas ficam em armazenamento privado. Os links de laudo e QR usam códigos longos e não adivinháveis.
            Em um aparelho usado sem internet, os dados do trabalho ficam guardados no próprio aparelho até serem enviados.
          </p>
        </Section>

        <Section title="Cookies e rastreamento">
          <p>O sistema usa apenas armazenamento essencial para manter você conectado e funcionar sem internet. Não usamos publicidade nem rastreadores de terceiros.</p>
        </Section>

        <Section title="Mudanças nesta política">
          <p>Se algo mudar, esta página será atualizada com a nova data.</p>
        </Section>
      </article>
    </main>
  );
}
