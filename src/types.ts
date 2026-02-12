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

export type TipoObjeto = '1' | '2' | '3'; // 1=Envelope, 2=Pacote, 3=Rolo

export interface CalculoFreteParams {
  cepDestino: string;
  peso?: number;
  comprimento?: number;
  largura?: number;
  altura?: number;
  diametro?: number;
  tipoObjeto?: TipoObjeto;
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

export interface ParametroProduto {
  cepOrigem: string;
  cepDestino: string;
  nuContrato: string;
  nuDR: number;
  nuRequisicao: string;
  tpObjeto: string;
  dtEvento: string;
  altura: string;
  largura: string;
  diametro: string;
  comprimento: string;
  psObjeto: string;
  coProduto: string;
  vlDeclarado?: string;
}

export interface PrecoRequest {
  idLote: string;
  parametrosProduto: ParametroProduto[];
}

export interface ParametroPrazo {
  cepOrigem: string;
  cepDestino: string;
  coProduto: string;
  nuRequisicao: string;
  dtEvento: string;
}

export interface PrazoRequest {
  idLote: string;
  parametrosPrazo: ParametroPrazo[];
}

export interface PrecoItem {
  coProduto: string;
  codigo?: string;
  pcFinal?: string;
  valor?: string;
  txErro?: string;
}

export interface PrazoItem {
  coProduto: string;
  codigo?: string;
  prazoEntrega?: number;
  prazo?: number;
  txErro?: string;
}

export type PrecoResponse = { objetos?: PrecoItem[] } | PrecoItem[];

export type PrazoResponse = { objetos?: PrazoItem[] } | PrazoItem[];
