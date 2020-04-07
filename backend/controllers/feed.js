const fs = require('fs');
const path = require('path');
const Post = require('../models/post');
const User = require('../models/user');
const { validationResult } = require('express-validator/check')
const io = require('../socket');

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;

    try {
        let totalItems = await Post.countDocuments();
        const posts = await Post.find()
                .populate('creator')
                .sort({createdAt: -1})
                .skip((currentPage - 1) * perPage)
                .limit(perPage)
    
        if (!posts) {
            const error = new Error('Post not found.');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            message: 'Posts fetched.',
            posts: posts,
            totalItems: totalItems
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);   
    }
};

exports.createPost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.');
        error.statusCode = 422;
        throw error;
    };

    if (!req.file) {
        const error = new Error('No file provided.');
        error.statusCode = 422;
        throw error;
    };
    
    const title = req.body.title;
    const imageUrl = req.file.path.replace("\\", "/");
    const content = req.body.content;
    const post = new Post({
        title: title,
        imageUrl: imageUrl,
        content: content,
        creator: req.userId
    });

    try {
        await post.save();

        const user = await User.findById(req.userId);

        user.posts.push(post);
        await user.save();

        console.log('Post created!');

        // 'io' para atualizar os posts in realtime
        // 'posts' é como vc definiu como nome do evento que vai ser "escutado" no cliente
        io.getIO().emit('posts', { 
            action: 'create', 
            post: {
                ...post._doc, 
                creator: { 
                    id: req.userId, 
                    name: user.name 
                }
            } 
        });        

        res.status(201).json({
            message: 'Post created!',
            post: post,
            creator: { 
                _id: user._id, 
                name: user.name
            }
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId);

        if (!post) {
            const error = new Error('Post not found.');
            error.statusCode = 404;
            throw error;
        };
        res.status(200).json({
            message: 'Post fetched.',
            post: post
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updatePost = async (req, res, next) => {
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.');
        error.statusCode = 422;
        throw error;
    };

    if (req.file) {
        imageUrl = req.file.path.replace("\\", "/");
    };

    if (!imageUrl) {
        const error = new Error('Problems with the image.');
        error.statusCode = 422;
        throw error;
    };

    try {
        const post = await Post.findById(postId).populate('creator');

        if (!post) {
            const error = new Error('Post not found.');
            error.statusCode = 404;
            throw error;
        };

        if (post.creator._id.toString() !== req.userId.toString()) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        };

        if (imageUrl !== post.imageUrl) {
            clearImage(post.imageUrl);
        };

        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;

        const result = await post.save();

        io.getIO('posts', {
            action: 'update',
            post: result
        });

        res.status(200).json({
            message: 'Post updated.',
            post: post
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Post not found.');
            error.statusCode = 404;
            throw error;
        };

        if (post.creator.toString() !== req.userId.toString()) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        };

        clearImage(post.imageUrl);

        await Post.findByIdAndRemove(postId);

        const user = await User.findById(req.userId);

        user.posts.pull(postId);
        await user.save();

        console.log('Deleted post.');

        io.getIO('posts', {
            action: 'delete',
            post: postId
        });

        res.status(200).json({ message: 'Deleted post.' })

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));
};