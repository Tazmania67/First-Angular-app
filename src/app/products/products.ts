import { Component, inject, OnInit, signal } from '@angular/core';
import { ProductsService } from '../services/products';
import { Product } from '../model/product.type';
import { catchError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
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
};

@Component({
  selector: 'app-products',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './products.html',
  styleUrl: './products.scss'
})

export class Products implements OnInit {
  categories: Category[] = categoriesData;
  productItems = signal<Product[]>([]);

  addProductButton() {
    console.log('Button was clicked!');
    // You can put any logic here
  }

  newProduct: NewProductForm = {
    name: '',
    quantity: '',
    price: '',
    _id: '',
    category: '',
  };

  showAddProduct = false;

  openAddProductModal() {
    this.showAddProduct = true;
  }
  closeAddProductModal() {
    this.showAddProduct = false;
  }

  addProduct() {
    const { name, quantity, price } = this.newProduct;
    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    if (name && quantityNum > 0 && priceNum >= 0) {
    const newEntry = {
      name: name.trim(),
      quantity: quantityNum,
      price: priceNum,
      category: this.newProduct.category ? this.newProduct.category.trim() : ''
    };

    this.productService.addProductToApi(newEntry).subscribe({
      next: (savedProduct: Product) => {
        this.productItems.update(current => [...current, savedProduct]);
        this.newProduct = { name: '', quantity: '', price: '', _id: '', category: '' };
        this.closeAddProductModal();
      },
      error: (err: unknown) => {
        console.error('Error saving product:', err);
        alert('There was a problem saving your product.');
      }
    });
    } else {
    alert('Please fill out all fields correctly!');
    }
  }

  deleteProduct(productId: string) {
    this.productService.deleteProductFromApi(productId).subscribe({
      next: () => {
        this.productItems.update(current =>
          current.filter(product => product._id !== productId)
        );
      },
      error: (err: any) => {
        console.error('Error deleting product:', err);
        alert('Kon product niet verwijderen.');
      }
    });
  }

  editProductId: string | null = null;

  editProductForm: NewProductForm = {
    name: '', 
    quantity: '', 
    price: '', 
    _id: '',
    category: ''
  };

  openEditProduct(product: Product) {
    this.editProductId = product._id;
    this.editProductForm = {
      name: product.name,
      quantity: product.quantity.toString(),
      price: product.price.toString(),
      _id: product._id,
      category: product.category
    };
  }

  productService = inject(ProductsService);

  updateProduct() {
    const { name, quantity, price } = this.editProductForm;
    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    if (name && quantityNum > 0 && priceNum >= 0 && this.editProductId) {
      const updatedEntry = {
        name: name.trim(),
        quantity: quantityNum,
        price: priceNum,
        category: this.editProductForm.category.trim()
      };

      this.productService.updateProductInApi(this.editProductId, updatedEntry).subscribe({
        next: (updatedProduct: Product) => {
          this.productItems.update(current =>
            current.map(p => p._id === updatedProduct._id ? updatedProduct : p)
          );
          this.editProductId = null;
          this.editProductForm = { 
            name: '', 
            quantity: '', 
            price: '', 
            _id: '' ,
            category: ''
          };
        },
        error: (err: any) => {
          console.error('Error updating product:', err);
          alert('Kon product niet bijwerken.');
        }
      });
    }
  }

  ngOnInit(): void {
    this.productService
      .getProductsFromApi()
      .pipe(
        catchError((err) => {
          console.log(err);
          throw err;
         })
      )
      .subscribe((products) => {
        this.productItems.set(products);
      });
  }

  getCategoryIcon(category: string | undefined): string {
    const match = this.categories.find(c => c.name === category);
    return match ? match.icon : '📦';
  }

  trackById(index: number, product: Product): string {
    return product._id;
  }

  get products() {
    return this.productItems();
  }

  searchQuery = '';

  selectedCategory = ''; // standaard: geen filter

  get filteredProducts(): Product[] {
    const all = this.productItems();

    // Eerst filteren op categorie
    let result = this.selectedCategory
      ? all.filter(p => p.category === this.selectedCategory)
      : all;

    // Vervolgens filteren op zoekterm (naam bevat)
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(query));
    }

    return result;
  }

  
}

