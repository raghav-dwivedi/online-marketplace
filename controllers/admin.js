const Product = require('../models/product');
const fileHelper = require('../util/file');

const { validationResult } = require('express-validator');

exports.getAddProduct = (req, res, next) => {
	res.render('admin/edit-product', {
		pageTitle: 'Add Product',
		path: '/admin/add-product',
		editing: false,
		hasError: false,
		preservedInput: {
			title: '',
			description: '',
			price: null,
		},
		validationErrors: [],
	});
};

exports.postAddProduct = (req, res, next) => {
	const title = req.body.title;
	const image = req.file;
	const description = req.body.description;
	const price = req.body.price;
	if (!image) {
		return res.status(422).render('admin/edit-product', {
			path: '/admin/add-product',
			pageTitle: 'Add Product',
			editing: false,
			hasError: true,
			preservedInput: {
				title: title,
				description: description,
				price: price,
			},
			validationErrors: [
				{
					msg: 'Invalid format of image file.',
				},
			],
		});
	}

	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(422).render('admin/edit-product', {
			path: '/admin/add-product',
			pageTitle: 'Add Product',
			editing: false,
			hasError: true,
			preservedInput: {
				title: title,
				description: description,
				price: price,
			},
			validationErrors: errors.array(),
		});
	}

	const imageUrl = req.imageUrl;

	const product = new Product({
		title: title,
		price: price,
		description: description,
		imageUrl: imageUrl,
		userId: req.user,
	});
	product
		.save()
		.then((result) => {
			console.log('Created Product');
			res.redirect('/admin/products');
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getEditProduct = (req, res, next) => {
	const editMode = req.query.edit;
	if (!editMode) {
		return res.redirect('/');
	}
	const prodId = req.params.productId;
	Product.findById(prodId)
		.then((product) => {
			if (!product) {
				return res.redirect('/');
			}
			res.render('admin/edit-product', {
				pageTitle: 'Edit Product',
				path: '/admin/add-product',
				editing: editMode,
				product: product,
				preservedInput: {
					title: '',
					description: '',
					price: null,
				},
				hasError: false,
				validationErrors: [],
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postEditProduct = (req, res, next) => {
	const prodId = req.body.productId;
	const updatedTitle = req.body.title;
	const updatedImage = req.file;
	const updatedDesc = req.body.description;
	const updatedPrice = req.body.price;

	const errors = validationResult(req);
	console.log(errors.array());
	if (!errors.isEmpty()) {
		return res.status(422).render('admin/edit-product', {
			path: '/admin/add-product',
			pageTitle: 'Edit Product',
			editing: true,
			preservedInput: {
				title: updatedTitle,
				description: updatedDesc,
				price: updatedPrice,
			},
			product: {
				_id: prodId,
			},
			hasError: true,
			validationErrors: {
				msg: 'Invalid format of image file.',
			},
		});
	}

	Product.findById(prodId)
		.then((product) => {
			if (product.userId.toString() !== req.user._id.toString()) {
				return res.redirect('/');
			}
			product.title = updatedTitle;
			product.price = updatedPrice;
			if (updatedImage) {
				fileHelper.deleteFile({
					Bucket: 'online-marketplace-images',
					Key: product.imageUrl,
				});
				product.imageUrl = req.imageUrl;
			}
			product.description = updatedDesc;
			return product.save().then((result) => {
				console.log('UPDATED PRODUCT!');
				res.redirect('/admin/products');
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		}); // this catch works for both the initial promise and the nested promise(product.save())
};

exports.deleteProduct = (req, res, next) => {
	const prodId = req.params.productId;
	Product.findById(prodId)
		.then((product) => {
			if (!product) {
				return next(new Error('Product not found.'));
			}
			fileHelper.deleteFile({
				Bucket: 'online-marketplace-images',
				Key: product.imageUrl,
			});
			return Product.deleteOne({
				_id: prodId,
				userId: req.user._id,
			});
		})
		.then(() => {
			console.log('Destroying Product');
			res.status(200).json({
				message: 'Success!',
			});
		})
		.catch((err) => {
			res.status(500).json({
				message: 'Deleting Product Failed!',
			});
		});
};

exports.getProducts = (req, res, next) => {
	Product.find({
		userId: req.user._id,
	})
		// we can automatically populate and control which fields are returned for both populated and find items
		// .select('title price -_id') // minus signifies exclude this field
		// .populate('userId')
		.then((products) => {
			console.log(products);
			res.render('admin/products', {
				path: '/admin/products',
				pageTitle: 'Admin Products',
				prods: products,
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};
