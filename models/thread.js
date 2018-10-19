var mongoose		= require('mongoose'),
	threadSchema	= new mongoose.Schema({
		title: String,
		date: {type: Date, default: Date.now},
		content: String,
		author: String,
		authorId:String,
		parent: {type: mongoose.Schema.Types.ObjectId , rel:"Forum"},
		comments: []
	});

module.exports = mongoose.model('Thread',threadSchema);