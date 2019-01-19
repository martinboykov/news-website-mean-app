const mongoose = require('mongoose');

const Category = require('../models/category');

const Subcategory = require('../models/subcategory');

const Fawn = require('Fawn');

const getSubcategories = async (req, res, next) => {
  const subcategories = await Subcategory.find();
  res.status(200).json({
    message: 'Subcategories fetched successfully',
    subcategories: subcategories,
  });
};

const addSubcategory = async (req, res, next) => {
  const newSubcategory = new Subcategory({ // mongo driver adds _id behind the scene,  before it is saved to MongoDB
    name: req.body.name,
    categoryId: req.body.categoryId,
  });

  const task = new Fawn.Task(); // eslint-disable-line new-cap
  task.save('subcategories', newSubcategory);
  const category = await Category.findOne({ _id: req.body.categoryId });
  category.subcategories.push(newSubcategory._id);
  task.update('categories', {
    _id: category._id,
  }, {
      $push: { subcategories: newSubcategory._id },
    });
  task.run()
    .then((result) => {
      res.status(200).json({
        message:
          'Subcategory added successfully and Category updated succesfully',
        subcategory: newSubcategory,
        // category: category,
      });
    })
    .catch((err) => {
      res.status(500).json({ message: 'Something failed.' });
      console.log(err);
    });
};

module.exports = {
  getSubcategories,
  addSubcategory,
};