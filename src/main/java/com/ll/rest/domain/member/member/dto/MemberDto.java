package com.ll.rest.domain.member.member.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ll.rest.domain.member.member.entity.Member;
import com.ll.rest.domain.post.post.entity.Post;
import com.ll.rest.global.jpa.entity.BaseTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import lombok.*;

import java.time.LocalDateTime;


@Getter
public class MemberDto {
    private long id;

    @JsonProperty("createdDatetime")
    private LocalDateTime createDate;

    @JsonProperty("modifiedDatetime")
    private LocalDateTime modifyDate;

    private String username;

    private String password;

    private String nickname;

    public MemberDto(Member member) {
        this.id = member.getId();
        this.createDate = member.getCreateDate();
        this.modifyDate = member.getModifyDate();
        this.username = member.getUsername();
        this.password = member.getPassword();
        this.nickname = member.getNickname();
    }
}

