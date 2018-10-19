var mongoose		= require('mongoose'),
	CommentSchema	= new mongoose.Schema({
		content: String,
		date: {type: Date, default: Date.now},
		author: String,
		authorId:String,
		parent: {type: mongoose.Schema.Types.ObjectId , rel:"Thread"}
	});

module.exports = mongoose.model('Comment',CommentSchema);