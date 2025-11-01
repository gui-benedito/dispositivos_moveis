import api from './api';
import { ListCategoriesResponse, CreateCategoryRequest, UpdateCategoryRequest, CategoryMutationResponse, Category } from '../types/category';

export class CategoryService {
  static async list(): Promise<ListCategoriesResponse> {
    const res = await api.get<ListCategoriesResponse>('/categories');
    return res.data;
  }

  static async create(payload: CreateCategoryRequest): Promise<CategoryMutationResponse> {
    const res = await api.post<CategoryMutationResponse>('/categories', payload);
    return res.data;
  }

  static async update(id: string, payload: UpdateCategoryRequest): Promise<CategoryMutationResponse> {
    const res = await api.put<CategoryMutationResponse>(`/categories/${id}`, payload);
    return res.data;
  }

  static async remove(id: string): Promise<{ success: boolean; message: string; }> {
    const res = await api.delete<{ success: boolean; message: string; }>(`/categories/${id}`);
    return res.data;
  }
}
