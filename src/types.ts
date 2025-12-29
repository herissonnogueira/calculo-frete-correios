export interface CorreiosConfig {
  contrato: string;
  cartaoPostagem: string;
  codigoAcesso: string;
  usuario?: string;
  ambiente?: 'homologacao' | 'producao';
  cepOrigem?: string;
  dr?: number;
}

export interface TokenResponse {
  token: string;
  expiraEm: string;
  emissao: string;
  ambiente: string;
  contrato?: {
    numero: string;
    dr: number;
  };
  cartaoPostagem?: {
    numero: string;
    contrato: string;
    dr: number;
  };
}

export interface CalculoFreteParams {
  cepDestino: string;
  peso: number;
  comprimento: number;
  largura: number;
  altura: number;
  valorDeclarado?: number;
  servicos?: string[];
}

export interface ServicoFrete {
  codigo: string;
  nome: string;
  prazo: number;
  valor: number;
  valorMaoPropria?: number;
  valorAvisoRecebimento?: number;
  valorValorDeclarado?: number;
  entregaDomiciliar: boolean;
  entregaSabado: boolean;
  erro?: string;
  msgErro?: string;
}

export interface CalculoFreteResponse {
  servicos: ServicoFrete[];
  erro?: string;
}
