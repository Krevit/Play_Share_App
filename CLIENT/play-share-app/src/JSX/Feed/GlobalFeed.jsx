import React from "react";
import Posts from "../Components/Posts";
import MakePostIcon from "../MakePostComponents/MakePostIcon"
import './globalFeed.css'
// import Post from "../Components/Post";
import { withRouter } from 'react-router-dom';                      // 1) will use this to redirect to feed after login


class GlobalFeed extends React.Component{
   
    /*
        users cant like own post
        mhasan1 cant like any posts. one his, two he already liked
        mhasan2 can like 1. two his, 
        mhasan3 can like any cus he never posted
    */

    render(){
        let posts = [
            {postID: 1, username: "mhasan1", handle: "@mhasan1", title: "This is my game play 1, we won 30 battles but lost 55 but that is ok because", content: "https://i.imgur.com/fiAqUmu.jpeg", group:"longGameGroupNa",group_type:"game", date:"Posted 5 min ago", likes:1, dislikes:0, total_likes: 1,   user_liked: ["mhasan2"], user_disliked: [], isURL:1},
            {postID: 2, username: "mhasan2", handle: "@mhasan2", title: "This is my game play 2, we won 30 battles but lost 55 but that is ok because", content: "https://i.imgur.com/fiAqUmu.jpeg", group:"Doom",group_type:"game", date:"Posted Dec 22, 2020", likes:0, dislikes:1, total_likes: -1,  user_liked: [],          user_disliked: ["mhasan1"], isURL:1 },
            {postID: 3, username: "mhasan2", handle: "@mhasan2", title: "This is my game play 2, we won 30 battles but lost 55 but that is ok because", content: "https://i.imgur.com/fiAqUmu.jpeg", group:"Doom",group_type:"game", date:"Posted 2423 min agodsf", likes:1, dislikes:0, total_likes: 1,   user_liked: ["mhasan1"], user_disliked: [], isURL:1 },
            {postID: 3, username: "mhasan2", handle: "@mhasan2", title: "This is my game play 2, we won 30 battles but lost 55 but that is ok because", date:"Posted 2423 min agodsf", likes:1, dislikes:0, total_likes: 1,   user_liked: ["mhasan1"], user_disliked: [], isURL:0 },
        ]
        return (
            <div class="global-feed-body">
                <div class="global-feed-posts">
                    <Posts posts={posts} logged_user={this.props.logged_user} />
                </div>
                <div class="global-feed-MakePostIcon">
                    <MakePostIcon history={this.props.history}  />
                </div>

            </div>

        );
    }
    
}

// export default GlobalFeed;
export default withRouter(GlobalFeed);                  // 3) need to export this class withRouter for redirect to work
