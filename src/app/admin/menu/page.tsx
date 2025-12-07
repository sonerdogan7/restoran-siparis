'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Category, MenuItem, SubCategory, SubSubCategory } from '@/types';
import { db, storage } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiArrowLeft,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiImage,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiSave,
  FiPackage
} from 'react-icons/fi';

// Kategori Form
interface CategoryFormData {
  name: string;
  type: 'food' | 'drink';
  order: number;
}

// Urun Form
interface ProductFormData {
  name: string;
  price: string; // String cunku bos olabilir (ucretsiz)
  category: string;
  subCategory: string;
  subSubCategory: string; // 3. seviye kategori
  destination: 'bar' | 'kitchen';
  description: string;
  isActive: boolean;
}

const initialCategoryForm: CategoryFormData = {
  name: '',
  type: 'food',
  order: 0
};

const initialProductForm: ProductFormData = {
  name: '',
  price: '',
  category: '',
  subCategory: '',
  subSubCategory: '',
  destination: 'kitchen',
  description: '',
  isActive: true
};

export default function MenuManagementPage() {
  const router = useRouter();
  const { user, currentBusiness } = useStore();
  const [activeTab, setActiveTab] = useState<'categories' | 'products'>('categories');

  // Kategoriler
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(initialCategoryForm);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Alt Kategori (2. seviye)
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<{ categoryId: string; subCategoryId: string | null } | null>(null);
  const [subCategoryName, setSubCategoryName] = useState('');

  // Alt-Alt Kategori (3. seviye)
  const [showSubSubCategoryModal, setShowSubSubCategoryModal] = useState(false);
  const [editingSubSubCategory, setEditingSubSubCategory] = useState<{ categoryId: string; subCategoryId: string; subSubCategoryId: string | null } | null>(null);
  const [subSubCategoryName, setSubSubCategoryName] = useState('');
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());

  // Urunler
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>(initialProductForm);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);

  // Yetki kontrolu
  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.roles.includes('admin')) {
      toast.error('Bu sayfaya erisim yetkiniz yok');
      router.replace('/select-panel');
      return;
    }
    if (!currentBusiness) {
      toast.error('Isletme bilgisi bulunamadi');
      router.replace('/login');
      return;
    }
  }, [user, currentBusiness, router]);

  // Kategorileri dinle
  useEffect(() => {
    if (!currentBusiness) return;

    const categoriesRef = collection(db, 'businesses', currentBusiness.id, 'categories');
    const unsubscribe = onSnapshot(categoriesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setCategories(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
    });

    return () => unsubscribe();
  }, [currentBusiness]);

  // Urunleri dinle
  useEffect(() => {
    if (!currentBusiness) return;

    const productsRef = collection(db, 'businesses', currentBusiness.id, 'products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MenuItem[];
      setProducts(data);
    });

    return () => unsubscribe();
  }, [currentBusiness]);

  // ==================== KATEGORI ISLEMLERI ====================

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    setLoading(true);
    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'businesses', currentBusiness.id, 'categories', editingCategory), {
          name: categoryForm.name,
          type: categoryForm.type,
          order: categoryForm.order
        });
        toast.success('Kategori guncellendi');
      } else {
        await addDoc(collection(db, 'businesses', currentBusiness.id, 'categories'), {
          name: categoryForm.name,
          type: categoryForm.type,
          order: categoryForm.order,
          subCategories: []
        });
        toast.success('Kategori eklendi');
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm(initialCategoryForm);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Islem basarisiz');
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!currentBusiness) return;

    const categoryProducts = products.filter(p => p.category === categoryId);
    if (categoryProducts.length > 0) {
      toast.error(`Bu kategoride ${categoryProducts.length} urun var. Once urunleri silin veya baska kategoriye tasayin.`);
      return;
    }

    if (!confirm('Bu kategoriyi silmek istediginize emin misiniz?')) return;

    try {
      await deleteDoc(doc(db, 'businesses', currentBusiness.id, 'categories', categoryId));
      toast.success('Kategori silindi');
    } catch (error) {
      toast.error('Silme basarisiz');
    }
  };

  // ==================== ALT KATEGORI ISLEMLERI ====================

  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !editingSubCategory) return;

    const category = categories.find(c => c.id === editingSubCategory.categoryId);
    if (!category) return;

    setLoading(true);
    try {
      let updatedSubCategories = [...(category.subCategories || [])];

      if (editingSubCategory.subCategoryId) {
        // Guncelle
        updatedSubCategories = updatedSubCategories.map(sc =>
          sc.id === editingSubCategory.subCategoryId
            ? { ...sc, name: subCategoryName }
            : sc
        );
      } else {
        // Yeni ekle
        const newId = `sub-${Date.now()}`;
        updatedSubCategories.push({
          id: newId,
          name: subCategoryName,
          order: updatedSubCategories.length,
          subSubCategories: [] // 3. seviye icin bos array
        });
      }

      await updateDoc(doc(db, 'businesses', currentBusiness.id, 'categories', editingSubCategory.categoryId), {
        subCategories: updatedSubCategories
      });

      toast.success(editingSubCategory.subCategoryId ? 'Alt kategori guncellendi' : 'Alt kategori eklendi');
      setShowSubCategoryModal(false);
      setEditingSubCategory(null);
      setSubCategoryName('');
    } catch (error) {
      toast.error('Islem basarisiz');
    }
    setLoading(false);
  };

  // ==================== ALT-ALT KATEGORI ISLEMLERI (3. SEVIYE) ====================

  const handleSaveSubSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !editingSubSubCategory) return;

    const category = categories.find(c => c.id === editingSubSubCategory.categoryId);
    if (!category) return;

    const subCategory = category.subCategories?.find(sc => sc.id === editingSubSubCategory.subCategoryId);
    if (!subCategory) return;

    setLoading(true);
    try {
      let updatedSubSubCategories = [...(subCategory.subSubCategories || [])];

      if (editingSubSubCategory.subSubCategoryId) {
        // Guncelle
        updatedSubSubCategories = updatedSubSubCategories.map(ssc =>
          ssc.id === editingSubSubCategory.subSubCategoryId
            ? { ...ssc, name: subSubCategoryName }
            : ssc
        );
      } else {
        // Yeni ekle
        const newId = `subsub-${Date.now()}`;
        updatedSubSubCategories.push({
          id: newId,
          name: subSubCategoryName,
          order: updatedSubSubCategories.length
        });
      }

      // Alt kategorileri guncelle
      const updatedSubCategories = category.subCategories?.map(sc =>
        sc.id === editingSubSubCategory.subCategoryId
          ? { ...sc, subSubCategories: updatedSubSubCategories }
          : sc
      ) || [];

      await updateDoc(doc(db, 'businesses', currentBusiness.id, 'categories', editingSubSubCategory.categoryId), {
        subCategories: updatedSubCategories
      });

      toast.success(editingSubSubCategory.subSubCategoryId ? 'Alt-alt kategori guncellendi' : 'Alt-alt kategori eklendi');
      setShowSubSubCategoryModal(false);
      setEditingSubSubCategory(null);
      setSubSubCategoryName('');
    } catch (error) {
      toast.error('Islem basarisiz');
    }
    setLoading(false);
  };

  const handleDeleteSubSubCategory = async (categoryId: string, subCategoryId: string, subSubCategoryId: string) => {
    if (!currentBusiness) return;

    const subSubCategoryProducts = products.filter(p =>
      p.category === categoryId &&
      p.subCategory === subCategoryId &&
      p.subSubCategory === subSubCategoryId
    );
    if (subSubCategoryProducts.length > 0) {
      toast.error(`Bu alt-alt kategoride ${subSubCategoryProducts.length} urun var. Once urunleri silin.`);
      return;
    }

    if (!confirm('Bu alt-alt kategoriyi silmek istediginize emin misiniz?')) return;

    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const subCategory = category.subCategories?.find(sc => sc.id === subCategoryId);
    if (!subCategory) return;

    try {
      const updatedSubSubCategories = subCategory.subSubCategories?.filter(ssc => ssc.id !== subSubCategoryId) || [];
      const updatedSubCategories = category.subCategories?.map(sc =>
        sc.id === subCategoryId
          ? { ...sc, subSubCategories: updatedSubSubCategories }
          : sc
      ) || [];

      await updateDoc(doc(db, 'businesses', currentBusiness.id, 'categories', categoryId), {
        subCategories: updatedSubCategories
      });
      toast.success('Alt-alt kategori silindi');
    } catch (error) {
      toast.error('Silme basarisiz');
    }
  };

  const toggleSubCategory = (subCategoryId: string) => {
    setExpandedSubCategories(prev => {
      const next = new Set(prev);
      if (next.has(subCategoryId)) {
        next.delete(subCategoryId);
      } else {
        next.add(subCategoryId);
      }
      return next;
    });
  };

  const handleDeleteSubCategory = async (categoryId: string, subCategoryId: string) => {
    if (!currentBusiness) return;

    const subCategoryProducts = products.filter(p => p.category === categoryId && p.subCategory === subCategoryId);
    if (subCategoryProducts.length > 0) {
      toast.error(`Bu alt kategoride ${subCategoryProducts.length} urun var. Once urunleri silin.`);
      return;
    }

    // Alt-alt kategori varsa uyar
    const category = categories.find(c => c.id === categoryId);
    const subCategory = category?.subCategories?.find(sc => sc.id === subCategoryId);
    if (subCategory?.subSubCategories && subCategory.subSubCategories.length > 0) {
      toast.error(`Bu alt kategoride ${subCategory.subSubCategories.length} alt-alt kategori var. Once onlari silin.`);
      return;
    }

    if (!confirm('Bu alt kategoriyi silmek istediginize emin misiniz?')) return;

    if (!category) return;

    try {
      const updatedSubCategories = (category.subCategories || []).filter(sc => sc.id !== subCategoryId);
      await updateDoc(doc(db, 'businesses', currentBusiness.id, 'categories', categoryId), {
        subCategories: updatedSubCategories
      });
      toast.success('Alt kategori silindi');
    } catch (error) {
      toast.error('Silme basarisiz');
    }
  };

  // ==================== URUN ISLEMLERI ====================

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Gorsel boyutu 5MB\'dan kucuk olmali');
        return;
      }
      setProductImage(file);
      setProductImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File, productId: string): Promise<string> => {
    if (!currentBusiness) throw new Error('Business not found');

    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}.${fileExt}`;
    const storageRef = ref(storage, `businesses/${currentBusiness.id}/products/${fileName}`);

    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const deleteImage = async (imageUrl: string) => {
    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Image delete error:', error);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    if (!productForm.category || !productForm.subCategory || !productForm.subSubCategory) {
      toast.error('Kategori, alt kategori ve alt-alt kategori secmelisiniz');
      return;
    }

    setLoading(true);
    try {
      const priceValue = productForm.price.trim() === '' ? null : parseFloat(productForm.price);

      if (editingProduct) {
        // Guncelle
        let imageUrl = existingImageUrl;

        // Yeni gorsel yuklendiyse
        if (productImage) {
          // Eski gorseli sil
          if (existingImageUrl) {
            await deleteImage(existingImageUrl);
          }
          imageUrl = await uploadImage(productImage, editingProduct);
        }

        await updateDoc(doc(db, 'businesses', currentBusiness.id, 'products', editingProduct), {
          name: productForm.name,
          price: priceValue,
          category: productForm.category,
          subCategory: productForm.subCategory,
          subSubCategory: productForm.subSubCategory,
          destination: productForm.destination,
          description: productForm.description,
          isActive: productForm.isActive,
          imageUrl: imageUrl
        });
        toast.success('Urun guncellendi');
      } else {
        // Yeni urun
        const docRef = await addDoc(collection(db, 'businesses', currentBusiness.id, 'products'), {
          name: productForm.name,
          price: priceValue,
          category: productForm.category,
          subCategory: productForm.subCategory,
          subSubCategory: productForm.subSubCategory,
          destination: productForm.destination,
          description: productForm.description,
          isActive: productForm.isActive,
          imageUrl: null
        });

        // Gorsel varsa yukle
        if (productImage) {
          const imageUrl = await uploadImage(productImage, docRef.id);
          await updateDoc(doc(db, 'businesses', currentBusiness.id, 'products', docRef.id), {
            imageUrl
          });
        }

        toast.success('Urun eklendi');
      }

      resetProductForm();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Islem basarisiz');
    }
    setLoading(false);
  };

  const handleEditProduct = (product: MenuItem) => {
    setEditingProduct(product.id);
    setProductForm({
      name: product.name,
      price: product.price !== null ? product.price.toString() : '',
      category: product.category,
      subCategory: product.subCategory,
      subSubCategory: product.subSubCategory || '',
      destination: product.destination,
      description: product.description || '',
      isActive: product.isActive !== false
    });
    setExistingImageUrl(product.imageUrl || null);
    setProductImagePreview(product.imageUrl || null);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId: string, imageUrl?: string) => {
    if (!currentBusiness) return;
    if (!confirm('Bu urunu silmek istediginize emin misiniz?')) return;

    try {
      // Gorseli sil
      if (imageUrl) {
        await deleteImage(imageUrl);
      }
      await deleteDoc(doc(db, 'businesses', currentBusiness.id, 'products', productId));
      toast.success('Urun silindi');
    } catch (error) {
      toast.error('Silme basarisiz');
    }
  };

  const resetProductForm = () => {
    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm(initialProductForm);
    setProductImage(null);
    setProductImagePreview(null);
    setExistingImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Alt kategorileri getir
  const getSubCategories = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.subCategories || [];
  };

  // Alt-alt kategorileri getir
  const getSubSubCategories = (categoryId: string, subCategoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    const subCategory = category?.subCategories?.find(sc => sc.id === subCategoryId);
    return subCategory?.subSubCategories || [];
  };

  // Kategori adini getir
  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || '';
  };

  // Alt kategori adini getir
  const getSubCategoryName = (categoryId: string, subCategoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.subCategories?.find(sc => sc.id === subCategoryId)?.name || '';
  };

  // Alt-alt kategori adini getir
  const getSubSubCategoryName = (categoryId: string, subCategoryId: string, subSubCategoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    const subCategory = category?.subCategories?.find(sc => sc.id === subCategoryId);
    return subCategory?.subSubCategories?.find(ssc => ssc.id === subSubCategoryId)?.name || '';
  };

  if (!user || !currentBusiness) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiArrowLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-800">Menu Yonetimi</h1>
            <p className="text-xs text-gray-500">{currentBusiness.name}</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Tabs */}
        <div className="flex border-t">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'categories'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500'
            }`}
          >
            Kategoriler
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'products'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500'
            }`}
          >
            Urunler ({products.length})
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'categories' ? (
          // ==================== KATEGORILER ====================
          <div>
            <button
              onClick={() => {
                setCategoryForm(initialCategoryForm);
                setEditingCategory(null);
                setShowCategoryModal(true);
              }}
              className="w-full py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition flex items-center justify-center gap-2 mb-4"
            >
              <FiPlus size={20} />
              Yeni Kategori Ekle
            </button>

            <div className="space-y-3">
              {categories.map(category => (
                <div key={category.id} className="bg-white rounded-xl shadow overflow-hidden">
                  {/* Kategori Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        category.type === 'food' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {category.type === 'food' ? 'Yiyecek' : 'Icecek'}
                      </span>
                      <span className="font-semibold">{category.name}</span>
                      <span className="text-xs text-gray-400">
                        ({category.subCategories?.length || 0} alt kategori)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryForm({
                            name: category.name,
                            type: category.type,
                            order: category.order || 0
                          });
                          setEditingCategory(category.id);
                          setShowCategoryModal(true);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <FiTrash2 size={16} />
                      </button>
                      {expandedCategories.has(category.id) ? (
                        <FiChevronUp className="text-gray-400" />
                      ) : (
                        <FiChevronDown className="text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Alt Kategoriler (2. Seviye) */}
                  {expandedCategories.has(category.id) && (
                    <div className="border-t bg-gray-50 p-3">
                      <div className="space-y-2">
                        {category.subCategories?.map(subCat => (
                          <div key={subCat.id} className="bg-white rounded-lg overflow-hidden">
                            {/* Alt Kategori Header */}
                            <div
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleSubCategory(subCat.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{subCat.name}</span>
                                <span className="text-xs text-gray-400">
                                  ({subCat.subSubCategories?.length || 0} alt-alt kategori)
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400 mr-2">
                                  {products.filter(p => p.subCategory === subCat.id).length} urun
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSubCategory({ categoryId: category.id, subCategoryId: subCat.id });
                                    setSubCategoryName(subCat.name);
                                    setShowSubCategoryModal(true);
                                  }}
                                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                                >
                                  <FiEdit2 size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSubCategory(category.id, subCat.id);
                                  }}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                                {expandedSubCategories.has(subCat.id) ? (
                                  <FiChevronUp size={14} className="text-gray-400" />
                                ) : (
                                  <FiChevronDown size={14} className="text-gray-400" />
                                )}
                              </div>
                            </div>

                            {/* Alt-Alt Kategoriler (3. Seviye) */}
                            {expandedSubCategories.has(subCat.id) && (
                              <div className="border-t bg-gray-100 p-2 pl-6">
                                <div className="space-y-1">
                                  {subCat.subSubCategories?.map(subSubCat => (
                                    <div
                                      key={subSubCat.id}
                                      className="flex items-center justify-between bg-white rounded p-2"
                                    >
                                      <span className="text-xs text-gray-700">{subSubCat.name}</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-400 mr-1">
                                          {products.filter(p => p.subSubCategory === subSubCat.id).length} urun
                                        </span>
                                        <button
                                          onClick={() => {
                                            setEditingSubSubCategory({
                                              categoryId: category.id,
                                              subCategoryId: subCat.id,
                                              subSubCategoryId: subSubCat.id
                                            });
                                            setSubSubCategoryName(subSubCat.name);
                                            setShowSubSubCategoryModal(true);
                                          }}
                                          className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                        >
                                          <FiEdit2 size={12} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSubSubCategory(category.id, subCat.id, subSubCat.id)}
                                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                                        >
                                          <FiTrash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => {
                                    setEditingSubSubCategory({
                                      categoryId: category.id,
                                      subCategoryId: subCat.id,
                                      subSubCategoryId: null
                                    });
                                    setSubSubCategoryName('');
                                    setShowSubSubCategoryModal(true);
                                  }}
                                  className="mt-2 w-full py-1.5 border border-dashed border-gray-300 text-gray-500 rounded hover:border-purple-400 hover:text-purple-500 transition text-xs"
                                >
                                  + Alt-Alt Kategori Ekle
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setEditingSubCategory({ categoryId: category.id, subCategoryId: null });
                          setSubCategoryName('');
                          setShowSubCategoryModal(true);
                        }}
                        className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-purple-400 hover:text-purple-500 transition text-sm"
                      >
                        + Alt Kategori Ekle
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          // ==================== URUNLER ====================
          <div>
            <button
              onClick={() => {
                resetProductForm();
                setShowProductModal(true);
              }}
              className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2 mb-4"
            >
              <FiPlus size={20} />
              Yeni Urun Ekle
            </button>

            {/* Kategorilere gore grupla */}
            {categories.map(category => {
              const categoryProducts = products.filter(p => p.category === category.id);
              if (categoryProducts.length === 0) return null;

              return (
                <div key={category.id} className="mb-6">
                  <h3 className="text-sm font-bold text-gray-600 mb-2 px-1">{category.name}</h3>
                  <div className="space-y-2">
                    {categoryProducts.map(product => (
                      <div
                        key={product.id}
                        className={`bg-white rounded-xl p-3 shadow flex items-center gap-3 ${
                          !product.isActive ? 'opacity-60' : ''
                        }`}
                      >
                        {/* Gorsel */}
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <FiPackage size={24} />
                            </div>
                          )}
                        </div>

                        {/* Bilgiler */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{product.name}</h4>
                            {!product.isActive && (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Pasif</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {getSubCategoryName(product.category, product.subCategory)}
                            {product.subSubCategory && ` > ${getSubSubCategoryName(product.category, product.subCategory, product.subSubCategory)}`}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-sm font-bold ${product.price === null ? 'text-green-600' : 'text-gray-800'}`}>
                              {product.price === null ? 'Ucretsiz' : `${product.price.toFixed(2)} TL`}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              product.destination === 'kitchen' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {product.destination === 'kitchen' ? 'Mutfak' : 'Bar'}
                            </span>
                          </div>
                        </div>

                        {/* Aksiyonlar */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.imageUrl)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {products.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <FiPackage size={48} className="mx-auto mb-3 opacity-30" />
                <p>Henuz urun eklenmemis</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Kategori Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-purple-500 p-4 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingCategory ? 'Kategori Duzenle' : 'Yeni Kategori'}
              </h2>
              <button onClick={() => setShowCategoryModal(false)}>
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori Adi
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Ornek: Ana Yemekler"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori Tipi
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryForm(prev => ({ ...prev, type: 'food' }))}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      categoryForm.type === 'food'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Yiyecek
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryForm(prev => ({ ...prev, type: 'drink' }))}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      categoryForm.type === 'drink'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Icecek
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Siralama (kucuk sayi once gosterilir)
                </label>
                <input
                  type="number"
                  value={categoryForm.order}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Iptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-purple-500 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alt Kategori Modal */}
      {showSubCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-purple-500 p-4 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingSubCategory?.subCategoryId ? 'Alt Kategori Duzenle' : 'Yeni Alt Kategori'}
              </h2>
              <button onClick={() => setShowSubCategoryModal(false)}>
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveSubCategory} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alt Kategori Adi
                </label>
                <input
                  type="text"
                  value={subCategoryName}
                  onChange={(e) => setSubCategoryName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Ornek: Corbalar"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubCategoryModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Iptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-purple-500 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Urun Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden my-4">
            <div className="bg-green-500 p-4 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingProduct ? 'Urun Duzenle' : 'Yeni Urun'}
              </h2>
              <button onClick={resetProductForm}>
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Gorsel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urun Gorseli
                </label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:bg-gray-200 transition flex items-center justify-center"
                  >
                    {productImagePreview ? (
                      <img src={productImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <FiImage size={32} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-purple-600 hover:text-purple-700"
                    >
                      Gorsel Sec
                    </button>
                    <p className="text-xs text-gray-400 mt-1">Max 5MB, JPG/PNG</p>
                    {productImagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductImage(null);
                          setProductImagePreview(null);
                          setExistingImageUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-xs text-red-500 mt-1"
                      >
                        Gorseli Kaldir
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Urun Adi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Urun Adi *
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ornek: Adana Kebap"
                  required
                />
              </div>

              {/* Fiyat */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fiyat (bos birakirsaniz ucretsiz olur)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 pr-12"
                    placeholder="0.00"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">TL</span>
                </div>
                {productForm.price === '' && (
                  <p className="text-xs text-green-600 mt-1">Bu urun ucretsiz olarak gorunecek</p>
                )}
              </div>

              {/* Kategori (1. Seviye) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori *
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value, subCategory: '', subSubCategory: '' }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Kategori Secin</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Alt Kategori (2. Seviye) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alt Kategori *
                </label>
                <select
                  value={productForm.subCategory}
                  onChange={(e) => setProductForm(prev => ({ ...prev, subCategory: e.target.value, subSubCategory: '' }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                  disabled={!productForm.category}
                >
                  <option value="">Alt Kategori Secin</option>
                  {getSubCategories(productForm.category).map(subCat => (
                    <option key={subCat.id} value={subCat.id}>{subCat.name}</option>
                  ))}
                </select>
              </div>

              {/* Alt-Alt Kategori (3. Seviye) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alt-Alt Kategori *
                </label>
                <select
                  value={productForm.subSubCategory}
                  onChange={(e) => setProductForm(prev => ({ ...prev, subSubCategory: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                  disabled={!productForm.subCategory}
                >
                  <option value="">Alt-Alt Kategori Secin</option>
                  {getSubSubCategories(productForm.category, productForm.subCategory).map(subSubCat => (
                    <option key={subSubCat.id} value={subSubCat.id}>{subSubCat.name}</option>
                  ))}
                </select>
              </div>

              {/* Hedef */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hazirlanacagi Yer
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setProductForm(prev => ({ ...prev, destination: 'kitchen' }))}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      productForm.destination === 'kitchen'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Mutfak
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductForm(prev => ({ ...prev, destination: 'bar' }))}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      productForm.destination === 'bar'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Bar
                  </button>
                </div>
              </div>

              {/* Aciklama */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aciklama (opsiyonel)
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="Urun hakkinda kisa aciklama..."
                />
              </div>

              {/* Aktif/Pasif */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={productForm.isActive}
                  onChange={(e) => setProductForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Urun aktif (menude gorunsun)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Iptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Kaydediliyor...' : (
                    <>
                      <FiSave size={18} />
                      Kaydet
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alt-Alt Kategori Modal (3. Seviye) */}
      {showSubSubCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-indigo-500 p-4 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingSubSubCategory?.subSubCategoryId ? 'Alt-Alt Kategori Duzenle' : 'Yeni Alt-Alt Kategori'}
              </h2>
              <button onClick={() => setShowSubSubCategoryModal(false)}>
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveSubSubCategory} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alt-Alt Kategori Adi
                </label>
                <input
                  type="text"
                  value={subSubCategoryName}
                  onChange={(e) => setSubSubCategoryName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ornek: Kebaplar"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubSubCategoryModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Iptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-indigo-500 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
