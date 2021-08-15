const path = require('path');

const express = require('express');
const { body } = require('express-validator');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/products', isAuth, adminController.getProducts);

router.get('/add-product', isAuth, adminController.getAddProduct);

router.post(
	'/add-product',
	[
		body('title', 'Invalid Title')
			.isString()
			.isLength({
				min: 3,
			})
			.trim(),
		body('image').custom((value, { req }) => {
			if (req.file.size > 2 * 1024 * 1024) {
				throw new Error('Image size must be under 2 MB');
			}
			return true;
		}),
		body('price', 'Invalid Price').isFloat(),
		body('description', 'Invalid Description')
			.isLength({
				min: 5,
				max: 400,
			})
			.trim(),
	],
	isAuth,
	adminController.postAddProduct
);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post(
	'/edit-product',
	[
		body('title', 'Invalid Title')
			.isString()
			.isLength({
				min: 3,
			})
			.trim(),
		body('image').custom((value, { req }) => {
			if (req.file.size > 2 * 1024 * 1024) {
				throw new Error('Image size must be under 2 MB');
			}
			return true;
		}),
		body('price', 'Invalid Price').isFloat(),
		body('description', 'Invalid Description')
			.isLength({
				min: 5,
				max: 400,
			})
			.trim(),
	],
	isAuth,
	adminController.postEditProduct
);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
