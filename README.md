# 🚀 Life OS - Pro Manager (v2.7)

> **Status do Sistema:** 🟢 Operacional (Production Ready)  
> **Conceito:** Console de monitoramento de performance pessoal baseado na lógica de um NOC (Network Operations Center).

O **Life OS - Pro Manager** é um ecossistema de gestão de produtividade que transforma rotinas diárias em métricas de telemetria. O objetivo é manter o "Uptime Humano" através do monitoramento de SLAs (Service Level Agreements) pessoais, gamificação por XP e logs de auditoria técnica.

---

## 🖥️ Visual Preview

*(Dica: Adicione aqui um GIF ou print da sua Dashboard principal)*
![Dashboard Life OS](<img width="1245" height="905" alt="image" src="https://github.com/user-attachments/assets/05106dec-47c6-4990-8d84-e31d94ae3bd9" />
)

---

## 🧪 Conceito Operacional (NOC Style)

Diferente de gerenciadores de tarefas convencionais, este projeto aplica conceitos de infraestrutura de TI à vida pessoal:

- **SLA Gauge:** Um medidor de disponibilidade que calcula em tempo real o percentual de tarefas concluídas vs. planejadas.
- **Human Uptime:** A visualização do progresso diário como se fosse o monitoramento de um servidor crítico.
- **Audit Log:** Registro centralizado de todas as operações realizadas (Treinos, Hábitos e To-Dos) no Command Center.

---

## 🛠️ Stack Tecnológica

- **Frontend:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) (Estética Dark/Cyberpunk)
- **Backend/Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Autenticação:** Supabase Auth (Google OAuth & Email/Password)
- **Infraestrutura:** Row Level Security (RLS) e SQL Views customizadas.

---

## 🏗️ Arquitetura de Dados e Segurança

Como um projeto voltado para portfólio técnico, o **Life OS - Pro Manager** implementa soluções robustas de backend:

### 1. Governança de Dados (RLS)
Todas as tabelas possuem **Row Level Security** habilitado, garantindo que os usuários autenticados acessem exclusivamente seus próprios dados via políticas de `auth.uid()`.

### 2. Camada de Abstração SQL
O sistema de backup e exportação utiliza a view `vw_export_csv` para normalizar dados de múltiplas fontes, tratando Enums e timestamps (`completed_at`) para garantir compatibilidade com o Microsoft Excel.

### 3. Motor de XP (Regras de Negócio)
- **Treinos:** 50 XP (Alta prioridade operacional)
- **Hábitos/Estratégias:** 30 XP (Manutenção de sistema)
- **To-Dos:** Dinâmico (Baixa: 15 | Média: 30 | Alta: 50 XP)

---

## 🚀 Evolução do Projeto (Roadmap)

| Versão | Marcos Principais |
|:---:|:---|
| **v1.0** | MVP inicial com tabelas CRUD básicas e integração Supabase. |
| **v2.0** | Implementação do Motor de XP e Dashboard visual de NOC. |
| **v2.5** | Criação das SQL Views e normalização do histórico de treinos. |
| **v2.7** | **Lançamento Atual:** Autenticação multi-modal, Fluxo de Recuperação de Senha e Rebranding Final. |

---

## ⚙️ Configuração Local

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/seu-usuario/life-os-pro-manager.git](https://github.com/seu-usuario/life-os-pro-manager.git)
