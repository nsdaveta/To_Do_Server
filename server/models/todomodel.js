const mongoose=require('mongoose')

const ToDo_Schema= new mongoose.Schema(
{
    title:{
        type:String,
        required:true
    },
    IsCompleted:{
        type:Boolean,
        default:false
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
})
const todos=mongoose.model('todos',ToDo_Schema);
module.exports=todos;