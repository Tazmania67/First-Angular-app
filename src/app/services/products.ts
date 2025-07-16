import { inject, Injectable } from '@angular/core';
import { Product } from '../model/product.type';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  constructor(private http: HttpClient) {}

  deleteProductFromApi(id: string): Observable<void> {
    return this.http.delete<void>(`http://localhost:3000/api/products/${id}`);
  }

  //http = inject(HttpClient);
  getProductsFromApi() {
    const url = `http://localhost:3000/api/products`;
    return this.http.get<Array<Product>>(url);
  }

  addProductToApi(product: Omit<Product, '_id'>): Observable<Product> {
    return this.http.post<Product>('http://localhost:3000/api/products', product);
  }

  updateProductInApi(id: string, updated: Omit<Product, '_id'>): Observable<Product> {
  return this.http.put<Product>(`http://localhost:3000/api/products/${id}`, updated);
  }

}
