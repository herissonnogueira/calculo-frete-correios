# Cálculo de Frete - Correios

Integração com a **nova API REST dos Correios** para cálculo de frete usando autenticação via token e contrato.

Diferente das bibliotecas que ainda usam a API SOAP antiga, esta implementação usa a API REST atual (`api.correios.com.br`), com autenticação via token, cálculo de preço e prazo em paralelo e renovação automática de tokens.

## Tecnologias

TypeScript, Node.js, Axios

## Instalação

```bash
npm install
```

## Configuração

Configure o arquivo `.env` com suas credenciais:

- **Código de acesso**: https://cws.correios.com.br/acesso-componentes
- **Contrato e cartão de postagem**: https://sfe.correios.com.br/consultarContrato/consultarContrato.jsf

### O que você precisa

- **Contrato**: Número do contrato empresarial com os Correios
- **Cartão de Postagem**: Número do cartão vinculado ao contrato
- **Código de Acesso**: Gerado no portal CWS dos Correios
- **Usuário**: Seu usuário do Meu Correios
- **CEP de Origem**: CEP de onde os produtos serão enviados
- **DR** (opcional): Código da Diretoria Regional, geralmente obtido automaticamente

## Uso Básico

```bash
npm run dev
```

## Uso em Aplicações

### Exemplo com Express.js

```typescript
import express from 'express';
import { CorreiosClient } from './correios';

const app = express();
const correios = new CorreiosClient({
  contrato: process.env.CORREIOS_CONTRATO!,
  cartaoPostagem: process.env.CORREIOS_CARTAO_POSTAGEM!,
  codigoAcesso: process.env.CORREIOS_CODIGO_ACESSO!,
  usuario: process.env.CORREIOS_USUARIO!,
  cepOrigem: process.env.CORREIOS_CEP_ORIGEM!,
});

app.post('/calcular-frete', async (req, res) => {
  try {
    const resultado = await correios.calcularFrete({
      cepDestino: req.body.cep,
      peso: req.body.peso,
      comprimento: req.body.comprimento,
      largura: req.body.largura,
      altura: req.body.altura,
      valorDeclarado: req.body.valorDeclarado,
    });
    res.json(resultado);
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});
```

### Exemplo em E-commerce

```typescript
async function calcularFreteNoCarrinho(produtos: Produto[], cepDestino: string) {
  const pesoTotal = produtos.reduce((acc, p) => acc + p.peso, 0);
  const dimensoes = calcularDimensoesTotais(produtos);

  const resultado = await correios.calcularFrete({
    cepDestino,
    peso: pesoTotal,
    comprimento: dimensoes.comprimento,
    largura: dimensoes.largura,
    altura: dimensoes.altura,
    servicos: ['03220', '03298'], // SEDEX e PAC
  });

  return resultado.servicos.map(s => ({
    nome: s.nome,
    valor: s.valor,
    prazo: s.prazo,
  }));
}
```

## Como Funciona

1. **Autenticação**: O cliente obtém um token automaticamente usando Basic Auth (usuário + código de acesso)
2. **Renovação**: O token é renovado automaticamente a cada 50 minutos
3. **Cálculo**: As requisições de preço e prazo são feitas em paralelo para melhor performance
4. **Resultado**: Os dados são combinados e retornados em um formato unificado
5. **Ambientes**: Suporta produção (`api.correios.com.br`) e homologação (`apihom.correios.com.br`)

## Parâmetros

### calcularFrete()

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `cepDestino` | string | Sim | CEP de destino (com ou sem hífen) |
| `peso` | number | Não | Peso em kg (mínimo: 0.3) |
| `comprimento` | number | Não | Comprimento em cm (mínimo: 16) |
| `largura` | number | Não | Largura em cm (mínimo: 11) |
| `altura` | number | Não | Altura em cm (mínimo: 2) |
| `diametro` | number | Não | Diâmetro em cm (para rolos) |
| `tipoObjeto` | string | Não | `'1'` Envelope, `'2'` Pacote, `'3'` Rolo (padrão: `'2'`) |
| `valorDeclarado` | number | Não | Valor declarado do produto |
| `servicos` | string[] | Não | Códigos dos serviços (padrão: SEDEX e PAC) |

### Serviços mais usados

| Código | Serviço |
|--------|---------|
| `03220` | SEDEX Contrato |
| `03298` | PAC Contrato |
| `03140` | SEDEX 12 |
| `03158` | SEDEX 10 |
| `03204` | SEDEX Hoje |
| `04227` | Correios Mini Envios |

## Estrutura

- `src/correios.ts` - Cliente da API
- `src/types.ts` - Tipos TypeScript
- `src/viacep.ts` - Consulta de CEP via ViaCEP
- `src/index.ts` - Exemplo de uso
