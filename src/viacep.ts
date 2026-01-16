import axios from 'axios';

export interface Endereco {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export async function consultarCep(cep: string): Promise<Endereco | null> {
  const cepLimpo = cep.replace(/\D/g, '');

  if (cepLimpo.length !== 8) {
    throw new Error('CEP inválido');
  }

  const response = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);

  if (response.data.erro) {
    return null;
  }

  return {
    cep: response.data.cep,
    logradouro: response.data.logradouro,
    complemento: response.data.complemento,
    bairro: response.data.bairro,
    localidade: response.data.localidade,
    uf: response.data.uf,
  };
}
