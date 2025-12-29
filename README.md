# API Correios - Cálculo de Frete

Integração com a API dos Correios para cálculo de frete usando autenticação via token e contrato.

Implementa autenticação via token, cálculo de preço e prazo em paralelo, com renovação automática de tokens antes da expiração.

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
2. **Renovação**: O token é renovado automaticamente quando faltam menos de 5 minutos para expirar
3. **Cálculo**: As requisições de preço e prazo são feitas em paralelo para melhor performance
4. **Resultado**: Os dados são combinados e retornados em um formato unificado

## Parâmetros

### calcularFrete()

- `cepDestino`: CEP de destino (8 dígitos, com ou sem hífen)
- `peso`: Peso em kg
- `comprimento`: Comprimento em cm
- `largura`: Largura em cm
- `altura`: Altura em cm
- `valorDeclarado` (opcional): Valor declarado do produto
- `servicos` (opcional): Códigos dos serviços. Padrão: `['03220', '03298']` (SEDEX e PAC)

## Estrutura

- `src/correios.ts` - Cliente da API
- `src/types.ts` - Tipos TypeScript
- `src/index.ts` - Exemplo de uso
