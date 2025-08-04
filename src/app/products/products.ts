import { Component, inject, OnInit, signal } from '@angular/core';
import { ProductsService } from '../services/products';
import { Product } from '../model/product.type';
import { catchError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import categoriesData from '../../assets/data/categories.json';

type Category = {
  name: string;
  icon: string;
};

type NewProductForm = {
  name: string;
  quantity: string;
  price: string;
  _id: string;
  category: string;
  image?: string;
};

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './products.html',
  styleUrl: './products.scss'
})

export class Products implements OnInit {
  categories: Category[] = categoriesData;
  productItems = signal<Product[]>([]);
  originalProducts = signal<Product[]>([]);
  sortDirection: 'asc' | 'desc' = 'asc';
  sortBy: '' | 'name' | 'quantity' | 'price' = '';
  searchQuery = '';
  selectedCategory = '';
  showAddProduct = false;
  editProductId: string | null = null;
  showConfirmDelete = signal(false);
  productToDelete = signal<Product | null>(null);
  selectedImage = signal<string | null>(null);

  openImageModal(imagePath: string | undefined): void {
    if (!imagePath) return;
    this.selectedImage.set(imagePath);
  }

  closeImageModal(): void {
    this.selectedImage.set(null);
  }

  newProduct: NewProductForm = {
    name: '', quantity: '', price: '', _id: '', category: '', image: ''
  };

  editProductForm: NewProductForm = {
    name: '', quantity: '', price: '', _id: '', category: '', image: ''
  };

  productService = inject(ProductsService);

  ngOnInit(): void {
    this.productService.getProductsFromApi()
    .pipe(catchError((err) => {
      console.error(err);
      throw err;
    }))
    .subscribe((products: Product[]) => {
      this.productItems.set(products);
      this.originalProducts.set(products);
    });
  }

  get products(): Product[] {
    return this.productItems();
  }

  get filteredProducts(): Product[] {
    let source = [...this.productItems()];

    if (this.sortBy === 'name') {
      source.sort((a, b) => this.sortDirection === 'asc'
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name));
    } else if (this.sortBy === 'price') {
      source.sort((a, b) => this.sortDirection === 'asc'
      ? a.price - b.price
      : b.price - a.price);
    } else if (this.sortBy === 'quantity') {
      source.sort((a, b) => this.sortDirection === 'asc'
      ? a.quantity - b.quantity
      : b.quantity - a.quantity);
    }

    let result = this.selectedCategory
    ? source.filter(p => p.category === this.selectedCategory)
    : source;

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(query));
    }

    return result;
  }

  toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  }

  onSortByChange(value: string): void {
    this.sortBy = value as any;
    if (value === '') {
      this.productItems.set([...this.originalProducts()]);
    }
  }

  openAddProductModal(): void {
    this.showAddProduct = true;
  }

  closeAddProductModal(): void {
    this.showAddProduct = false;
  }

  addProduct(): void {
    const { name, quantity, price, category, image } = this.newProduct;
    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    if (name && quantityNum > 0 && priceNum >= 0) {
      const newEntry: Omit<Product, '_id'> = {
        name: name.trim(),
        quantity: quantityNum,
        price: priceNum,
        category: category.trim(),
        image: image?.trim() || ''
      };

      this.productService.addProductToApi(newEntry).subscribe({
        next: (savedProduct: Product) => {
          this.productItems.update(current => [...current, savedProduct]);
          this.originalProducts.update(current => [...current, savedProduct]);
          this.newProduct = { name: '', quantity: '', price: '', _id: '', category: '', image: '' };
          this.closeAddProductModal();
        },
        error: (err) => {
          console.error('Error saving product:', err);
          alert('Kon product niet toevoegen.');
        }
      });
    } else {
      alert('Vul alle velden correct in.');
    }
  }

  openEditProduct(product: Product): void {
    this.editProductId = product._id;
    this.editProductForm = {
      name: product.name,
      quantity: product.quantity.toString(),
      price: product.price.toString(),
      _id: product._id,
      category: product.category,
      image: product.image ?? ''
    };
  }

  updateProduct(): void {
    const { name, quantity, price, category, image } = this.editProductForm;
    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    if (name && quantityNum > 0 && priceNum >= 0 && this.editProductId) {
      const updatedEntry: Product = {
        name: name.trim(),
        quantity: quantityNum,
        price: priceNum,
        category: category.trim(),
        image: image?.trim() || '',
        _id: this.editProductId
      };

      this.productService.updateProductInApi(this.editProductId, updatedEntry).subscribe({
        next: (updatedProduct: Product) => {
          this.productItems.update(current =>
            current.map(p => p._id === updatedProduct._id ? updatedProduct : p)
          );
          this.originalProducts.update(current =>
            current.map(p => p._id === updatedProduct._id ? updatedProduct : p)
          );
          this.editProductId = null;
          this.editProductForm = { name: '', quantity: '', price: '', _id: '', category: '', image: '' };
        },
        error: (err) => {
          console.error('Error updating product:', err);
          alert('Kon product niet bijwerken.');
        }
      });
    }
  }

  deleteProduct(productId: string): void {
    const product = this.products.find(p => p._id === productId);
    if (product) {
      this.productToDelete.set(product);
      this.showConfirmDelete.set(true);
    }
  }

  confirmDelete(): void {
    const product = this.productToDelete();
    if (!product) return;

    this.productService.deleteProductFromApi(product._id).subscribe({
      next: () => {
        this.productItems.update(current =>
          current.filter(p => p._id !== product._id)
        );
        this.originalProducts.update(current =>
          current.filter(p => p._id !== product._id)
        );
        this.resetDeleteModal();
      },
      error: (err) => {
        console.error('Error deleting product:', err);
        alert('Kon product niet verwijderen.');
        this.resetDeleteModal();
      }
    });
  }

  cancelDelete(): void {
    this.resetDeleteModal();
  }

  resetDeleteModal(): void {
    this.productToDelete.set(null);
    this.showConfirmDelete.set(false);
  }

  getCategoryIcon(category: string | undefined): string {
    const match = this.categories.find(c => c.name === category);
    return match ? match.icon : '📦';
  }

  trackById(index: number, product: Product): string {
    return product._id;
  }

  exportToCSV(): void {
    const products = this.filteredProducts;
    if (!products || products.length === 0) {
      alert('Geen producten om te exporteren.');
      return;
    }

    const headers = Object.keys(products[0]);
    const rows = products.map(p => headers.map(h => `"${p[h as keyof Product] ?? ''}"`).join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'producten.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
}