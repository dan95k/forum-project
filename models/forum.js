var mongoose			= require('mongoose'),
	forumSchema			= new mongoose.Schema({
		name: String,
		parent: {type: String, rel:"Categorie"},
		description: String,
		threads:[]
	});

module.exports = mongoose.model('Forum',forumSchema);