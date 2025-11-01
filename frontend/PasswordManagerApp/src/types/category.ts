export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListCategoriesResponse {
  success: boolean;
  data: Category[];
}

export interface CreateCategoryRequest {
  name: string;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  icon?: string;
  color?: string;
  cascadeUpdate?: boolean;
}

export interface CategoryMutationResponse<T = Category> {
  success: boolean;
  message: string;
  data: T;
}
