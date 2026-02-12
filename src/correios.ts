import axios, { AxiosInstance } from 'axios';
import { CorreiosConfig, CalculoFreteParams, CalculoFreteResponse, ServicoFrete, TokenResponse } from './types';

const DIMENSOES_MINIMAS = {
  peso: 0.3,
  comprimento: 16,
  largura: 11,
  altura: 2,
};

export class CorreiosClient {
  private config: CorreiosConfig;
  private apiClient: AxiosInstance;
  private tokenClient: AxiosInstance;
  private baseUrl: string;
  private tokenUrl: string;
  private token: string | null = null;
  private tokenObtidoEm: number = 0;
  private contratoDoToken: string | null = null;
  private drDoToken: number | null = null;

  constructor(config: CorreiosConfig) {
    this.config = config;

    const isHomologacao = config.ambiente === 'homologacao';
    this.baseUrl = isHomologacao ? 'https://apihom.correios.com.br' : 'https://api.correios.com.br';
    this.tokenUrl = isHomologacao ? 'https://apihom.correios.com.br/token' : 'https://api.correios.com.br/token';
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });

    this.tokenClient = axios.create({
      baseURL: this.tokenUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });

    this.apiClient.interceptors.request.use(async (config) => {
      if (!this.token || this.isTokenExpirado()) {
        await this.obterToken();
      }
      if (this.token) {
        config.headers['Authorization'] = `Bearer ${this.token}`;
      }
      return config;
    });
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error('Erro da API:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            url: error.config?.url,
          });
        } else if (error.request) {
          console.error('Erro de requisição:', {
            message: error.message,
            code: error.code,
            url: error.config?.url,
            baseURL: this.baseUrl,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  private isTokenExpirado(): boolean {
    const cinquentaMinutos = 50 * 60 * 1000;
    return Date.now() - this.tokenObtidoEm > cinquentaMinutos;
  }

  async obterToken(): Promise<string> {
    try {
      if (!this.config.usuario) {
        throw new Error(
          'Usuário do Meu Correios é obrigatório para autenticação.\n' +
          'Configure a variável CORREIOS_USUARIO no arquivo .env'
        );
      }

      const basicAuth = Buffer.from(
        `${this.config.usuario}:${this.config.codigoAcesso}`
      ).toString('base64');

      const requestData: any = {
        numero: this.config.cartaoPostagem,
        contrato: this.config.contrato,
      };

      if (this.config.dr) {
        requestData.dr = this.config.dr;
      }

      let response;
      try {
        response = await this.tokenClient.post<TokenResponse>(
          '/v1/autentica/cartaopostagem',
          requestData,
          {
            headers: {
              'Authorization': `Basic ${basicAuth}`,
            },
          }
        );
      } catch (error: any) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          response = await this.tokenClient.post<TokenResponse>(
            '/v1/autentica',
            {},
            {
              headers: {
                'Authorization': `Basic ${basicAuth}`,
              },
            }
          );
        } else {
          throw error;
        }
      }

      if (response.data.token) {
        this.token = response.data.token;
        this.tokenObtidoEm = Date.now();

        if (response.data.cartaoPostagem) {
          this.contratoDoToken = response.data.cartaoPostagem.contrato || this.config.contrato;
          this.drDoToken = response.data.cartaoPostagem.dr ?? this.config.dr ?? null;
        } else if (response.data.contrato) {
          this.contratoDoToken = response.data.contrato.numero || this.config.contrato;
          this.drDoToken = response.data.contrato.dr ?? this.config.dr ?? null;
        } else {
          this.contratoDoToken = this.config.contrato;
          this.drDoToken = this.config.dr ?? null;
        }

        return this.token;
      } else {
        throw new Error('Token não retornado na resposta');
      }
    } catch (error: any) {
      if (error.response) {
        const errorData = error.response.data;
        const msg = errorData?.msgs?.[0] || errorData?.causa || error.response.statusText;
        throw new Error(`Erro ao obter token (${error.response.status}): ${msg}`);
      }
      throw error;
    }
  }
  async calcularFrete(params: CalculoFreteParams): Promise<CalculoFreteResponse> {
    try {
      if (!this.token || this.isTokenExpirado()) {
        await this.obterToken();
      }

      const cepDestino = params.cepDestino.replace(/\D/g, '');
      const cepOrigem = (this.config.cepOrigem || '').replace(/\D/g, '');

      if (cepDestino.length !== 8) {
        throw new Error('CEP de destino inválido');
      }

      if (!cepOrigem || cepOrigem.length !== 8) {
        throw new Error('CEP de origem é obrigatório');
      }

      const contrato = this.contratoDoToken || this.config.contrato;
      const dr = this.drDoToken ?? this.config.dr ?? 0;
      const servicos = params.servicos || ['03220', '03298'];

      const peso = Math.max(params.peso ?? DIMENSOES_MINIMAS.peso, DIMENSOES_MINIMAS.peso);
      const comprimento = Math.max(params.comprimento ?? DIMENSOES_MINIMAS.comprimento, DIMENSOES_MINIMAS.comprimento);
      const largura = Math.max(params.largura ?? DIMENSOES_MINIMAS.largura, DIMENSOES_MINIMAS.largura);
      const altura = Math.max(params.altura ?? DIMENSOES_MINIMAS.altura, DIMENSOES_MINIMAS.altura);

      const precoRequest = {
        idLote: '1',
        parametrosProduto: servicos.map((codigoServico) => ({
          cepOrigem: cepOrigem,
          cepDestino: cepDestino,
          nuContrato: contrato,
          nuDR: dr,
          nuRequisicao: '1',
          tpObjeto: '2',
          dtEvento: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
          altura: Math.round(altura).toString(),
          largura: Math.round(largura).toString(),
          diametro: '0',
          comprimento: Math.round(comprimento).toString(),
          psObjeto: Math.round(peso * 1000).toString(),
          coProduto: codigoServico,
          ...(params.valorDeclarado ? { vlDeclarado: params.valorDeclarado.toString() } : {}),
        })),
      };

      const prazoRequest = {
        idLote: '1',
        parametrosPrazo: servicos.map((codigoServico) => ({
          cepOrigem: cepOrigem,
          cepDestino: cepDestino,
          coProduto: codigoServico,
          nuRequisicao: '1',
          dtEvento: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
        })),
      };

      const [precoResponse, prazoResponse] = await Promise.all([
        this.obterPreco(precoRequest),
        this.obterPrazo(prazoRequest),
      ]);

      return this.combinarPrecoPrazo(precoResponse, prazoResponse);

    } catch (error: any) {
      if (error.response) {
        const data = error.response.data;
        const msg = data?.msgs?.[0] || data?.mensagem || data?.message || data?.erro || error.response.statusText;
        throw new Error(`Erro na API dos Correios (${error.response.status}): ${msg}`);
      } else if (error.request) {
        throw new Error('Erro de conexão com a API dos Correios');
      } else {
        throw error;
      }
    }
  }

  private async obterPreco(requestData: any): Promise<any> {
    const endpoints = [
      '/preco/v1/nacional',
      '/preco/v1',
      '/api/preco/v1/nacional',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.apiClient.post(endpoint, requestData);
        return response.data;
      } catch (error: any) {
        if (error.response && error.response.status !== 404) {
          throw error;
        }
      }
    }
    throw new Error('Nenhum endpoint de preço encontrado');
  }

  private async obterPrazo(requestData: any): Promise<any> {
    const endpoints = [
      '/prazo/v1/nacional',
      '/prazo/v1',
      '/api/prazo/v1/nacional',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.apiClient.post(endpoint, requestData);
        return response.data;
      } catch (error: any) {
        if (error.response && error.response.status !== 404) {
          throw error;
        }
      }
    }
    throw new Error('Nenhum endpoint de prazo encontrado');
  }

  private combinarPrecoPrazo(precoData: any, prazoData: any): CalculoFreteResponse {
    const servicos: ServicoFrete[] = [];
    const precos = precoData?.objetos || precoData || [];
    const prazos = prazoData?.objetos || prazoData || [];

    const prazoMap = new Map();
    if (Array.isArray(prazos)) {
      prazos.forEach((prazo: any) => {
        const codigo = prazo.coProduto || prazo.codigo;
        if (codigo) {
          prazoMap.set(codigo, prazo);
        }
      });
    }
    if (Array.isArray(precos)) {
      precos.forEach((preco: any) => {
        const codigo = preco.coProduto || preco.codigo;
        const prazo = prazoMap.get(codigo);

        const valor = preco.pcFinal || preco.valor || '0';
        const valorNum = parseFloat(valor.toString().replace(',', '.')) || 0;

        servicos.push({
          codigo: codigo || 'N/A',
          nome: this.getNomeServico(codigo),
          prazo: prazo?.prazoEntrega || prazo?.prazo || 0,
          valor: valorNum,
          entregaDomiciliar: true,
          entregaSabado: false,
          erro: preco.txErro || prazo?.txErro,
          msgErro: preco.txErro || prazo?.txErro,
        });
      });
    }

    return { servicos };
  }

  private getNomeServico(codigo: string): string {
    const servicos: { [key: string]: string } = {
      '03140': 'SEDEX 12 CONTRATO AG',
      '03158': 'SEDEX 10 CONTRATO AG',
      '03174': 'SEDEX 12 REVERSO',
      '03182': 'SEDEX 10 REVERSO',
      '03190': 'SEDEX HOJE REVERSO',
      '03204': 'SEDEX HOJE CONTRATO AG',
      '03212': 'SEDEX CONTR GRAND FORMATO',
      '03220': 'SEDEX CONTRATO AG',
      '03247': 'SEDEX REVERSO',
      '03271': 'SEDEX CONTRATO PGTO ENTREGA',
      '03298': 'PAC CONTRATO AG',
      '03301': 'PAC REVERSO',
      '03310': 'PAC CONTRATO PGTO ENTREGA',
      '03328': 'PAC CONTR GRAND FORMATO',
      '03662': 'SEDEX HOJE EMPRESARIAL',
      '03972': 'TRANSFER LOG',
      '04000': 'PAC PC CONTRATO AG',
      '04090': 'SEDEX PC CONTRATO AG',
      '04227': 'CORREIOS MINI ENVIOS CTR AG',
      '04960': 'DESVIO MINI ENVIOS AG',
      '04014': 'SEDEX à vista',
      '04065': 'SEDEX à vista pagamento na entrega',
      '04510': 'PAC à vista',
      '04707': 'PAC à vista pagamento na entrega',
      '40126': 'SEDEX a Cobrar, sem contrato',
      '40215': 'SEDEX 10, sem contrato',
      '40290': 'SEDEX Hoje, sem contrato',
      '40096': 'SEDEX com contrato',
      '40436': 'SEDEX a Cobrar, com contrato',
      '40444': 'SEDEX 10, com contrato',
      '40568': 'SEDEX 12, com contrato',
      '40606': 'SEDEX Hoje, com contrato',
      '41068': 'PAC com contrato',
      '41106': 'PAC a Cobrar, com contrato',
    };

    return servicos[codigo] || `Serviço ${codigo}`;
  }

  async verificarConexao(): Promise<{ conectado: boolean; mensagem: string }> {
    try {
      await this.obterToken();
      return { conectado: true, mensagem: 'Conexão com a API dos Correios OK' };
    } catch (error: any) {
      return { conectado: false, mensagem: error.message || 'Falha na conexão' };
    }
  }

  validarConfiguracao(): boolean {
    if (!this.config.contrato) {
      throw new Error('Contrato não configurado');
    }
    if (!this.config.cartaoPostagem) {
      throw new Error('Cartão de postagem não configurado');
    }
    if (!this.config.codigoAcesso) {
      throw new Error('Código de acesso não configurado');
    }
    return true;
  }
}
