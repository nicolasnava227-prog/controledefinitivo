# 🚀 Como publicar o Compras Kuali no Vercel (passo a passo)

Tudo gratuito. Vamos usar **Vercel** (hospedagem) + **Turso** (banco de dados na nuvem).

---

## Resumo: o que vamos fazer

1. Criar o banco de dados no **Turso** (grátis, 9 GB)
2. Subir o código no **GitHub** (repositório privado)
3. Publicar no **Vercel** (hospedagem do site + API)
4. Acessar pelo link que o Vercel gera

---

## Passo 1 — Criar banco de dados no Turso

1. Acesse **[turso.tech](https://turso.tech)** e clique em **Sign up**
2. Entre com GitHub ou email
3. No dashboard, clique em **Create Database**
4. Nome: `compras-kuali` — em **Location** escolha **AWS US East (Virginia)** (é a mais próxima do Brasil na lista)
5. Clique em **Create**
6. Abra o banco criado e clique em **Connect** → aba **ENV File**. Você vai ver duas linhas:
   ```
   TURSO_DATABASE_URL=libsql://compras-kuali-xxxx.turso.io
   TURSO_AUTH_TOKEN=eyJhbGc...
   ```
7. **Copie e guarde os dois valores** — vão ser usados no Passo 3

---

## Passo 2 — Subir no GitHub

1. Acesse **[github.com](https://github.com)** e crie conta (ou faça login)
2. Clique no **+** no canto superior direito → **New repository**
3. Nome: `compras-kuali`
4. Marque **Private** (privado, só você vê)
5. Clique em **Create repository**
6. Na página que abrir, clique em **uploading an existing file**
7. **Descompacte o ZIP** e arraste TODOS os arquivos e pastas pra lá:
   - `api/` (pasta com `index.js`)
   - `src/` (pasta com App.jsx e main.jsx)
   - `server.js`
   - `package.json`
   - `vercel.json`
   - `vite.config.js`
   - `index.html`
   - `.gitignore`
   - **NÃO suba o `.env`** (tem suas chaves secretas)
8. Escreva "primeiro upload" e clique em **Commit changes**

---

## Passo 3 — Publicar no Vercel

1. Acesse **[vercel.com](https://vercel.com)** e clique em **Sign up** → **Continue with GitHub**
2. No dashboard, clique em **Add New...** → **Project**
3. Encontre o repositório `compras-kuali` e clique em **Import**
4. Na tela de configuração, expanda **Environment Variables** e adicione **TRÊS** variáveis:

   | Name                   | Value                                              |
   |------------------------|----------------------------------------------------|
   | `ANTHROPIC_API_KEY`    | `sk-ant-sua-chave-aqui`                            |
   | `TURSO_DATABASE_URL`   | `libsql://compras-kuali-xxxx.turso.io` (Passo 1)  |
   | `TURSO_AUTH_TOKEN`     | `eyJhbGc...` (Passo 1)                             |

5. Para pegar a chave da Anthropic:
   - Acesse **[console.anthropic.com](https://console.anthropic.com)**
   - Vá em **API Keys** → **Create Key**
   - Copie e cole no Vercel

6. Clique em **Deploy**. Vai demorar ~1 minuto.

🎉 **Pronto!** O Vercel gera um link tipo `compras-kuali.vercel.app` — seu site tá no ar.

---

## Passo 4 — Acessar do celular

1. Abra o link no Chrome do celular
2. Toque nos **3 pontinhos** → **Adicionar à tela inicial**
3. Agora tem ícone no celular como um app!

---

## Informações importantes

### Custo
- **Vercel**: grátis até 100 GB de banda/mês (muito mais que precisa)
- **Turso**: grátis até 9 GB de armazenamento e 1 bilhão de linhas lidas/mês
- **GitHub**: grátis (repositório privado)
- **API Anthropic**: ~R$0,05 por nota analisada

### Login padrão
- Usuário: `admin`
- Senha: `admin`
- **Troque a senha** em Funcionários → Equipe após o primeiro login

### Onde ficam os dados?
- No banco Turso (nuvem). Persistem para sempre enquanto o projeto existir.
- Funcionários, notas, checklists, pontos — tudo lá.

### Como atualizar o app
1. Edite os arquivos no GitHub
2. Vercel republica automaticamente em ~30 segundos

### Backup dos dados
- Turso faz backup automático.
- Se quiser export manual: instale o [Turso CLI](https://docs.turso.tech/cli/installation) e rode `turso db shell compras-kuali ".dump" > backup.sql`

---

## Limitação importante: tamanho das fotos

O plano grátis do Vercel aceita requisições de até **~4,5 MB**. Fotos de nota fiscal tiradas pelo celular costumam ter 1–3 MB, então funciona bem. Se uma foto muito grande falhar, tire outra com menos resolução ou use a câmera do app em modo normal (não alta resolução).

---

## Dúvidas

**O Vercel é seguro?**
Sim, é usado por milhões de apps. Seu repositório é privado e as variáveis de ambiente são criptografadas.

**E se eu parar de usar?**
Pode deletar o projeto no Vercel e no Turso a qualquer momento. Sem compromisso.

**Posso ter meu próprio domínio?**
Sim! Compre um domínio (ex: kuali.com.br ~R$40/ano) e configure em Project → Settings → Domains no Vercel.

**Quantas pessoas podem usar ao mesmo tempo?**
Sem limite prático. Vercel + Turso no plano grátis suportam um restaurante tranquilamente.

**Posso rodar localmente pra testar?**
Sim. Crie um `.env` na raiz com as três variáveis (pode usar `file:kuali.db` pro Turso local) e rode:
```
npm install
npm run build
npm start
```
