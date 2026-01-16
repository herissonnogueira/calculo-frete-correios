import dotenv from 'dotenv';
import { CorreiosClient } from './correios';
import { consultarCep } from './viacep';

dotenv.config();

async function main() {
  try {
    const contrato = process.env.CORREIOS_CONTRATO;
    const cartaoPostagem = process.env.CORREIOS_CARTAO_POSTAGEM;
    const codigoAcesso = process.env.CORREIOS_CODIGO_ACESSO;
    const ambiente = (process.env.CORREIOS_AMBIENTE || 'producao') as 'homologacao' | 'producao';
    const cepOrigem = process.env.CORREIOS_CEP_ORIGEM;
    const usuario = process.env.CORREIOS_USUARIO;
    const dr = process.env.CORREIOS_DR ? parseInt(process.env.CORREIOS_DR) : undefined;

    if (!contrato || !cartaoPostagem || !codigoAcesso || !usuario) {
      console.error('Erro: Variáveis de ambiente não configuradas');
      process.exit(1);
    }

    const correios = new CorreiosClient({
      contrato,
      cartaoPostagem,
      codigoAcesso,
      ambiente,
      cepOrigem,
      usuario,
      dr,
    });

    correios.validarConfiguracao();

    console.log('Verificando conexão...');
    const status = await correios.verificarConexao();
    console.log(`Status: ${status.conectado ? '✓' : '✗'} ${status.mensagem}`);
    console.log('');

    console.log('Consultando CEP 01310100...');
    const endereco = await consultarCep('01310100');
    if (endereco) {
      console.log(`  ${endereco.logradouro}, ${endereco.bairro}`);
      console.log(`  ${endereco.localidade} - ${endereco.uf}`);
    }
    console.log('');

    console.log('Calculando frete...');
    console.log(`CEP origem: ${cepOrigem}`);
    console.log(`CEP destino: 01310100`);
    console.log('');

    const resultado = await correios.calcularFrete({
      cepDestino: '01310100',
      peso: 0.5,
      comprimento: 20,
      largura: 15,
      altura: 10,
    });

    console.log('Resultados:');
    resultado.servicos.forEach((servico) => {
      if (servico.erro) {
        console.log(`  ${servico.nome}: Erro - ${servico.erro}`);
      } else {
        console.log(`  ${servico.nome}: R$ ${servico.valor.toFixed(2)} - ${servico.prazo} dias úteis`);
      }
    });

  } catch (error: any) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { CorreiosClient } from './correios';
export { consultarCep } from './viacep';
export * from './types';

