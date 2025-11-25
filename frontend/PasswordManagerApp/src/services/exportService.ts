import api from './api';

export const ExportService = {
  async exportJson(masterPassword: string) {
    const res = await api.post('/export/json', { masterPassword });
    return res.data;
  }
};
