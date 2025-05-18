# MarKae - Sistema de Gestão de Presença

Sistema de gestão de presença desenvolvido para o cursinho Maio 68, permitindo o controle de presenças através de diferentes métodos de validação (geolocalização, QR code, código manual).

## Funcionalidades

- Autenticação de usuários
- Diferentes níveis de acesso (admin, coordenador, professor, aluno)
- Gestão de instituições
- Gestão de turmas e horários
- Controle de presença com múltiplos métodos de validação
- Relatórios de presença

## Tecnologias

- React
- TypeScript
- Supabase (Autenticação e Banco de Dados)
- TanStack Query (React Query)
- Tailwind CSS

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase

## Configuração do Ambiente

1. Clone o repositório
```bash
git clone [URL_DO_REPOSITORIO]
cd markae
```

2. Instale as dependências
```bash
npm install
# ou
yarn
```

3. Configure as variáveis de ambiente
Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```

4. Configure o banco de dados
- Execute as migrações do Supabase localizadas em `/supabase/migrations`
- Configure as policies de segurança
- Configure as views necessárias

5. Inicie o servidor de desenvolvimento
```bash
npm run dev
# ou
yarn dev
```

## Estrutura do Banco de Dados

### Tabelas Principais
- `profiles`: Perfis de usuários
- `institutions`: Instituições
- `institution_settings`: Configurações das instituições
- `subjects`: Disciplinas
- `classes`: Aulas
- `class_times`: Horários de aula
- `attendance`: Registro de presenças

### Views
- `institution_profiles`: Perfis da instituição atual
- `available_classes`: Aulas disponíveis para confirmação de presença
- `institution_settings_view`: Configurações da instituição atual
- `user_attendance`: Presenças do usuário atual

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
