/* eslint-disable no-undefined*/
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  // required data
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String, // T0D0: TO BE CHECKED LATER (HTML editor or not)
    required: true,
  },
  author: { // One-to-Many with Denornmalization: stays the same almost always
    name: {
      type: String,
      required: true,
    },
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  imageMainPath: {
    type: String,
    required: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId, // One-to-Many: may need frequent change
    ref: 'Category',
    required: true,
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag',
  }],
  subcategoryId: {
    type: mongoose.Schema.Types.ObjectId, // One-to-Many: may need frequent change
    ref: 'Subcategory',
  },
  // not required data
  popularity: {
    type: Number,
    default: 0,
  },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  imagePaths: {
    type: [String],
    default: undefined,
  },

});

module.exports = mongoose.model('Post', postSchema);